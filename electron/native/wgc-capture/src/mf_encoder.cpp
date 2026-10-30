#include "mf_encoder.h"
#include <mfapi.h>
#include <mferror.h>
#include <codecapi.h>
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <cstring>
#include "../../common/bt709_video.h"

#pragma comment(lib, "mfplat.lib")
#pragma comment(lib, "mfreadwrite.lib")
#pragma comment(lib, "mf.lib")
#pragma comment(lib, "mfuuid.lib")

static UINT32 calculateScreenRecordingBitrate(int width, int height, int fps) {
    constexpr uint64_t kFourKPixels = 3840ULL * 2160ULL;
    constexpr uint64_t kQhdPixels = 2560ULL * 1440ULL;
    constexpr UINT32 kBitrate4K = 45000000;
    constexpr UINT32 kBitrateQhd = 28000000;
    constexpr UINT32 kBitrateBase = 18000000;
    constexpr double kHighFrameRateBoost = 1.35;

    const uint64_t pixels =
        static_cast<uint64_t>((std::max)(width, 1)) *
        static_cast<uint64_t>((std::max)(height, 1));
    const UINT32 baseBitrate =
        pixels >= kFourKPixels ? kBitrate4K :
        pixels >= kQhdPixels ? kBitrateQhd :
        kBitrateBase;
    const double boost = fps >= 60 ? kHighFrameRateBoost : 1.0;
    return static_cast<UINT32>(static_cast<double>(baseBitrate) * boost + 0.5);
}

// How long the hardware encoder gets to produce its first frame. In the background (start-up)
// nobody waits, so it can be generous; when a recording is waiting on it, one second is the limit.
static constexpr DWORD kBackgroundProbeTimeoutMs = 3000;
static constexpr DWORD kOnDemandTrialTimeoutMs = 1000;

// Hands one NV12 frame to a sink writer.
static bool submitNv12Sample(IMFSinkWriter* writer, DWORD streamIndex,
                             const std::vector<uint8_t>& frameBuffer,
                             int64_t timestampHns, int64_t durationHns) {
    if (!writer || frameBuffer.empty()) return false;

    const DWORD bufferSize = static_cast<DWORD>(frameBuffer.size());
    ComPtr<IMFMediaBuffer> buffer;
    HRESULT hr = MFCreateMemoryBuffer(bufferSize, &buffer);
    if (FAILED(hr)) return false;

    BYTE* bufferData = nullptr;
    hr = buffer->Lock(&bufferData, nullptr, nullptr);
    if (FAILED(hr)) return false;

    std::memcpy(bufferData, frameBuffer.data(), bufferSize);
    buffer->Unlock();
    buffer->SetCurrentLength(bufferSize);

    ComPtr<IMFSample> sample;
    hr = MFCreateSample(&sample);
    if (FAILED(hr)) return false;

    sample->AddBuffer(buffer.Get());
    sample->SetSampleTime(timestampHns);
    sample->SetSampleDuration(durationHns);

    hr = writer->WriteSample(streamIndex, sample.Get());
    if (FAILED(hr)) {
        std::cerr << "ERROR: WriteSample failed: 0x" << std::hex << hr << std::endl;
    }
    return SUCCEEDED(hr);
}

MFEncoder::MFEncoder() {}

MFEncoder::~MFEncoder() {
    finalize();
}

bool MFEncoder::initialize(const std::wstring& outputPath, int width, int height, int fps,
                           ID3D11Device* device, ID3D11DeviceContext* context,
                           int hardwareVerdict) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (initialized_) return false;

    if (fps <= 0) {
        std::cerr << "ERROR: Encoder fps must be positive, got " << fps << std::endl;
        return false;
    }

    if (width % 2 != 0 || height % 2 != 0) {
        std::cerr << "ERROR: Encoder dimensions must be even, got " << width << "x" << height << std::endl;
        return false;
    }

    width_ = width;
    height_ = height;
    fps_ = fps;
    device_ = device;
    context_ = context;

    HRESULT hr = MFStartup(MF_VERSION);
    if (FAILED(hr)) {
        std::cerr << "ERROR: MFStartup failed: 0x" << std::hex << hr << std::endl;
        return false;
    }

    // Try the GPU encoder first. Some machines accept frames but never produce any (seen with an
    // AMD RX 9070 XT), which would hang the recording; then fall back to Microsoft's software
    // H.264 encoder. Silent on purpose: this is an exceptional case.
    if (hardwareVerdict >= 0) {
        usingHardware_ = hardwareVerdict == 1;  // already tested at app start-up: no waiting here
    } else {
        // The user is waiting at this point (Record was pressed before the start-up test ended),
        // so give the encoder one second at most.
        const ULONGLONG trialStarted = GetTickCount64();
        usingHardware_ = hardwareEncoderResponds(kOnDemandTrialTimeoutMs);
        std::cerr << "Encoder trial took " << (GetTickCount64() - trialStarted) << " ms" << std::endl;
    }
    if (!usingHardware_) {
        std::cerr << "Encoder: hardware H.264 unavailable, using the software encoder" << std::endl;
    } else {
        std::cerr << "Encoder: hardware H.264" << std::endl;
    }
    if (!createSinkWriter(outputPath, usingHardware_, sinkWriter_, streamIndex_)) {
        return false;
    }

    // Pre-allocate staging texture
    D3D11_TEXTURE2D_DESC stagingDesc = {};
    stagingDesc.Width = width_;
    stagingDesc.Height = height_;
    stagingDesc.MipLevels = 1;
    stagingDesc.ArraySize = 1;
    stagingDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    stagingDesc.SampleDesc.Count = 1;
    stagingDesc.Usage = D3D11_USAGE_STAGING;
    stagingDesc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;

    hr = device_->CreateTexture2D(&stagingDesc, nullptr, &stagingTexture_);
    if (FAILED(hr)) {
        std::cerr << "ERROR: Failed to create staging texture: 0x" << std::hex << hr << std::endl;
        return false;
    }

    // WGC window captures can change frame size while recording. Keep the muxer
    // output dimensions stable by compositing resized frames into this fixed
    // BGRA surface before CPU readback.
    D3D11_TEXTURE2D_DESC compositeDesc = {};
    compositeDesc.Width = width_;
    compositeDesc.Height = height_;
    compositeDesc.MipLevels = 1;
    compositeDesc.ArraySize = 1;
    compositeDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    compositeDesc.SampleDesc.Count = 1;
    compositeDesc.Usage = D3D11_USAGE_DEFAULT;
    compositeDesc.BindFlags = D3D11_BIND_RENDER_TARGET;

    hr = device_->CreateTexture2D(&compositeDesc, nullptr, &resizeCompositeTexture_);
    if (FAILED(hr)) {
        std::cerr << "ERROR: Failed to create resize composite texture: 0x" << std::hex << hr << std::endl;
        return false;
    }

    hr = device_->CreateRenderTargetView(resizeCompositeTexture_.Get(), nullptr, &resizeCompositeView_);
    if (FAILED(hr)) {
        std::cerr << "ERROR: Failed to create resize composite view: 0x" << std::hex << hr << std::endl;
        return false;
    }

    // Pre-allocate NV12 buffer
    const int ySize = width_ * height_;
    const int uvSize = (width_ / 2) * (height_ / 2) * 2;
    nv12Buffer_.resize(ySize + uvSize);
    lastFrameBuffer_.clear();
    firstSampleTimeHns_ = -1;
    lastSampleTimeHns_ = -1;

    initialized_ = true;
    return true;
}

bool MFEncoder::createSinkWriter(const std::wstring& outputPath, bool hardware,
                                 ComPtr<IMFSinkWriter>& writer, DWORD& streamIndex) {
    // Output media type (H.264)
    ComPtr<IMFMediaType> outputType;
    HRESULT hr = MFCreateMediaType(&outputType);
    if (FAILED(hr)) return false;

    outputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
    outputType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_H264);
    const UINT32 videoBitrate = calculateScreenRecordingBitrate(width_, height_, fps_);
    outputType->SetUINT32(MF_MT_AVG_BITRATE, videoBitrate);
    MFSetAttributeSize(outputType.Get(), MF_MT_FRAME_SIZE, width_, height_);
    MFSetAttributeRatio(outputType.Get(), MF_MT_FRAME_RATE, fps_, 1);
    MFSetAttributeRatio(outputType.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1);
    outputType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
    hr = setBt709LimitedVideoAttributes(outputType.Get());
    if (FAILED(hr)) return false;
    if (hardware) {
        std::cerr << "Encoder bitrate: " << videoBitrate << " bps for "
                  << width_ << "x" << height_ << "@" << fps_ << "fps" << std::endl;
    }

    // Input media type (NV12)
    ComPtr<IMFMediaType> inputType;
    hr = MFCreateMediaType(&inputType);
    if (FAILED(hr)) return false;

    inputType->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
    inputType->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_NV12);
    MFSetAttributeSize(inputType.Get(), MF_MT_FRAME_SIZE, width_, height_);
    MFSetAttributeRatio(inputType.Get(), MF_MT_FRAME_RATE, fps_, 1);
    MFSetAttributeRatio(inputType.Get(), MF_MT_PIXEL_ASPECT_RATIO, 1, 1);
    inputType->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
    hr = setBt709LimitedVideoAttributes(inputType.Get());
    if (FAILED(hr)) return false;

    // Create SinkWriter with MPEG4 container
    ComPtr<IMFAttributes> writerAttrs;
    hr = MFCreateAttributes(&writerAttrs, 1);
    if (FAILED(hr)) return false;

    writerAttrs->SetUINT32(MF_READWRITE_ENABLE_HARDWARE_TRANSFORMS, hardware ? TRUE : FALSE);

    hr = MFCreateSinkWriterFromURL(outputPath.c_str(), nullptr, writerAttrs.Get(), &writer);
    if (FAILED(hr)) {
        std::cerr << "ERROR: MFCreateSinkWriterFromURL failed: 0x" << std::hex << hr << std::endl;
        return false;
    }

    hr = writer->AddStream(outputType.Get(), &streamIndex);
    if (FAILED(hr)) {
        std::cerr << "ERROR: AddStream failed: 0x" << std::hex << hr << std::endl;
        return false;
    }

    hr = writer->SetInputMediaType(streamIndex, inputType.Get(), nullptr);
    if (FAILED(hr)) {
        std::cerr << "ERROR: SetInputMediaType failed: 0x" << std::hex << hr << std::endl;
        return false;
    }

    hr = writer->BeginWriting();
    if (FAILED(hr)) {
        std::cerr << "ERROR: BeginWriting failed: 0x" << std::hex << hr << std::endl;
        return false;
    }

    return true;
}

// Sends a few test frames to a throwaway hardware-encoder writer and checks that it produces
// output. A healthy encoder answers within a fraction of a second; a stuck one never does.
bool MFEncoder::hardwareEncoderResponds(DWORD timeoutMs) {
    // Test hook: pretend the hardware encoder is unavailable.
    char forced[8] = {};
    if (GetEnvironmentVariableA("SCREEN_STUDIO_FORCE_SOFTWARE_ENCODER", forced, sizeof(forced)) > 0 &&
        forced[0] == '1') {
        return false;
    }

    constexpr int kTrialFrames = 12;
    constexpr DWORD kPollIntervalMs = 20;

    // Throwaway file in the temp folder, so a stuck encoder never leaves debris next to the recording.
    wchar_t tempDir[MAX_PATH] = {};
    const DWORD tempLen = GetTempPathW(MAX_PATH, tempDir);
    const std::wstring probePath =
        std::wstring(tempLen > 0 && tempLen < MAX_PATH ? tempDir : L".\\") +
        L"screen-studio-hwprobe-" + std::to_wstring(GetCurrentProcessId()) + L".mp4";
    ComPtr<IMFSinkWriter> probeWriter;
    DWORD probeStream = 0;
    if (!createSinkWriter(probePath, true, probeWriter, probeStream)) {
        DeleteFileW(probePath.c_str());
        return false;
    }

    // Mid-gray NV12 test frame.
    const size_t ySize = static_cast<size_t>(width_) * static_cast<size_t>(height_);
    std::vector<uint8_t> frame(ySize + ySize / 2, 128);
    std::fill(frame.begin(), frame.begin() + ySize, 96);

    const int64_t frameDurationHns = 10000000LL / fps_;
    for (int i = 0; i < kTrialFrames; ++i) {
        if (!submitNv12Sample(probeWriter.Get(), probeStream, frame, i * frameDurationHns, frameDurationHns)) {
            (void)probeWriter.Detach();  // do not risk a blocking release of a misbehaving writer
            DeleteFileW(probePath.c_str());
            return false;
        }
    }

    bool works = false;
    for (DWORD waited = 0; waited < timeoutMs; waited += kPollIntervalMs) {
        MF_SINK_WRITER_STATISTICS stats = {};
        stats.cb = sizeof(stats);
        if (SUCCEEDED(probeWriter->GetStatistics(probeStream, &stats)) && stats.qwNumSamplesEncoded > 0) {
            works = true;
            break;
        }
        Sleep(kPollIntervalMs);
    }

    if (works) {
        probeWriter->Finalize();
        probeWriter.Reset();
    } else {
        // A stuck encoder can also block its own shutdown: leave it alone and let the process
        // end clean it up instead of risking a hang of the whole recording.
        (void)probeWriter.Detach();
    }
    DeleteFileW(probePath.c_str());
    return works;
}

bool MFEncoder::probeHardwareEncoder(int width, int height, int fps, int64_t& elapsedMs) {
    elapsedMs = 0;
    if (width <= 0 || height <= 0 || fps <= 0) return false;

    MFEncoder encoder;
    encoder.width_ = width - (width % 2);
    encoder.height_ = height - (height % 2);
    encoder.fps_ = fps;

    const HRESULT hr = MFStartup(MF_VERSION);
    if (FAILED(hr)) return false;

    const ULONGLONG started = GetTickCount64();
    const bool works = encoder.hardwareEncoderResponds(kBackgroundProbeTimeoutMs);
    elapsedMs = static_cast<int64_t>(GetTickCount64() - started);
    return works;  // no MFShutdown on purpose, see the header
}

bool MFEncoder::writeFrame(ID3D11Texture2D* texture, int64_t timestampHns) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (!initialized_ || !sinkWriter_) return false;

    D3D11_TEXTURE2D_DESC sourceDesc = {};
    texture->GetDesc(&sourceDesc);

    if (sourceDesc.Width == static_cast<UINT>(width_) &&
        sourceDesc.Height == static_cast<UINT>(height_)) {
        context_->CopyResource(stagingTexture_.Get(), texture);
    } else {
        if (!resizeCompositeTexture_ || !resizeCompositeView_) return false;

        const FLOAT clearColor[4] = {0.0f, 0.0f, 0.0f, 1.0f};
        context_->ClearRenderTargetView(resizeCompositeView_.Get(), clearColor);

        D3D11_BOX sourceBox = {};
        sourceBox.left = 0;
        sourceBox.top = 0;
        sourceBox.front = 0;
        sourceBox.right = (std::min)(sourceDesc.Width, static_cast<UINT>(width_));
        sourceBox.bottom = (std::min)(sourceDesc.Height, static_cast<UINT>(height_));
        sourceBox.back = 1;

        if (sourceBox.right == 0 || sourceBox.bottom == 0) return false;

        context_->CopySubresourceRegion(
            resizeCompositeTexture_.Get(),
            0,
            0,
            0,
            0,
            texture,
            0,
            &sourceBox);
        context_->CopyResource(stagingTexture_.Get(), resizeCompositeTexture_.Get());
    }

    D3D11_MAPPED_SUBRESOURCE mapped;
    HRESULT hr = context_->Map(stagingTexture_.Get(), 0, D3D11_MAP_READ, 0, &mapped);
    if (FAILED(hr)) return false;

    // Convert full-range desktop BGRA to explicitly tagged BT.709 video-range NV12.
    const uint8_t* bgra = static_cast<const uint8_t*>(mapped.pData);
    const int bgraPitch = static_cast<int>(mapped.RowPitch);
    convertBgraToBt709LimitedNv12(bgra, bgraPitch, width_, height_, nv12Buffer_);

    context_->Unmap(stagingTexture_.Get(), 0);

    // WGC may stop delivering frames while the scene is static; keep the MP4
    // timeline continuous by repeating the previous frame before writing a new one.
    int64_t normalizedTimestampHns = 0;
    normalizeWriteTimestampHnsLocked(timestampHns, normalizedTimestampHns);

    if (!lastFrameBuffer_.empty() && !extendLastFrameToLocked(normalizedTimestampHns)) {
        return false;
    }

    bool wroteSample = writeNv12SampleLocked(nv12Buffer_, normalizedTimestampHns);
    if (wroteSample) {
        lastFrameBuffer_ = nv12Buffer_;
        lastSampleTimeHns_ = normalizedTimestampHns;
    }
    return wroteSample;
}

bool MFEncoder::extendLastFrameTo(int64_t timestampHns) {
    std::lock_guard<std::mutex> lock(mutex_);

    int64_t normalizedTimestampHns = 0;
    if (!normalizeTimelineTimestampHnsLocked(timestampHns, normalizedTimestampHns)) {
        return false;
    }

    return extendLastFrameToLocked(normalizedTimestampHns);
}

void MFEncoder::normalizeWriteTimestampHnsLocked(int64_t timestampHns, int64_t& normalizedTimestampHns) {
    if (firstSampleTimeHns_ < 0) {
        firstSampleTimeHns_ = timestampHns < 0 ? 0 : timestampHns;
    }

    normalizedTimestampHns = timestampHns - firstSampleTimeHns_;
    if (normalizedTimestampHns < 0) {
        normalizedTimestampHns = 0;
    }
}

bool MFEncoder::normalizeTimelineTimestampHnsLocked(
    int64_t timestampHns,
    int64_t& normalizedTimestampHns
) const {
    if (firstSampleTimeHns_ < 0) return false;

    normalizedTimestampHns = timestampHns - firstSampleTimeHns_;
    if (normalizedTimestampHns < 0) {
        normalizedTimestampHns = 0;
    }
    return true;
}

bool MFEncoder::extendLastFrameToLocked(int64_t timestampHns) {
    if (!initialized_ || !sinkWriter_) return false;
    if (lastFrameBuffer_.empty()) return false;
    if (lastSampleTimeHns_ < 0) return false;

    if (fps_ <= 0) return false;
    const int64_t frameDurationHns = 10000000LL / fps_;
    if (frameDurationHns <= 0) return false;
    if (timestampHns <= lastSampleTimeHns_ + frameDurationHns) {
        return true;
    }

    int64_t nextSampleTimeHns = lastSampleTimeHns_ + frameDurationHns;
    while (nextSampleTimeHns + frameDurationHns <= timestampHns) {
        if (!writeNv12SampleLocked(lastFrameBuffer_, nextSampleTimeHns)) {
            return false;
        }
        lastSampleTimeHns_ = nextSampleTimeHns;
        nextSampleTimeHns += frameDurationHns;
    }

    return true;
}

bool MFEncoder::writeNv12SampleLocked(const std::vector<uint8_t>& frameBuffer, int64_t timestampHns) {
    if (frameBuffer.empty()) return false;
    if (fps_ <= 0) return false;

    const int64_t frameDurationHns = 10000000LL / fps_;
    if (frameDurationHns <= 0) return false;

    return submitNv12Sample(sinkWriter_.Get(), streamIndex_, frameBuffer, timestampHns, frameDurationHns);
}

bool MFEncoder::finalize() {
    std::lock_guard<std::mutex> lock(mutex_);

    if (!initialized_) return false;
    if (!sinkWriter_) return false;

    HRESULT hr = sinkWriter_->Finalize();
    if (FAILED(hr)) {
        std::cerr << "ERROR: SinkWriter Finalize failed: 0x" << std::hex << hr << std::endl;
    }

    initialized_ = false;
    sinkWriter_.Reset();
    stagingTexture_.Reset();
    resizeCompositeView_.Reset();
    resizeCompositeTexture_.Reset();
    nv12Buffer_.clear();
    lastFrameBuffer_.clear();
    nv12Buffer_.shrink_to_fit();
    lastFrameBuffer_.shrink_to_fit();
    firstSampleTimeHns_ = -1;
    lastSampleTimeHns_ = -1;
    MFShutdown();
    return SUCCEEDED(hr);
}
