// Mock implementation of fluent-ffmpeg for testing
let shouldSucceed = true;

const createMockFfmpegInstance = () => {
  let eventHandlers = {};

  return {
    seekInput: jest.fn().mockReturnThis(),
    frames: jest.fn().mockReturnThis(),
    size: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(event, handler) {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
      return this;
    }),
    run: jest.fn().mockImplementation(function() {
      // Simulate async execution
      setImmediate(() => {
        if (shouldSucceed) {
          if (eventHandlers['start']) {
            eventHandlers['start'].forEach(h => h('ffmpeg command'));
          }
          if (eventHandlers['progress']) {
            eventHandlers['progress'].forEach(h => h({ percent: 50 }));
          }
          if (eventHandlers['end']) {
            eventHandlers['end'].forEach(h => h());
          }
        } else {
          if (eventHandlers['error']) {
            eventHandlers['error'].forEach(h => h(new Error('FFmpeg failed'), '', 'stderr'));
          }
        }
      });
      return this;
    }),
    videoCodec: jest.fn().mockReturnThis(),
    videoBitrate: jest.fn().mockReturnThis(),
    audioCodec: jest.fn().mockReturnThis(),
    audioBitrate: jest.fn().mockReturnThis(),
    fps: jest.fn().mockReturnThis(),
    addOption: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    noVideo: jest.fn().mockReturnThis(),
    setStartTime: jest.fn().mockReturnThis(),
    setDuration: jest.fn().mockReturnThis(),
    videoFilters: jest.fn().mockReturnThis(),
  };
};

const ffmpegMock = jest.fn(() => createMockFfmpegInstance());

// Add ffprobe method
ffmpegMock.ffprobe = jest.fn((filePath, callback) => {
  const mockMetadata = {
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: 1920,
        height: 1080,
        r_frame_rate: '30/1',
      },
    ],
    format: {
      duration: 30.5,
      bit_rate: '2500000',
    },
  };
  // Call callback asynchronously to simulate real ffprobe behavior
  setImmediate(() => {
    callback(null, mockMetadata);
  });
});

// Helper to control success/failure
ffmpegMock._setShouldSucceed = (value) => {
  shouldSucceed = value;
};

// For ES6 default export
module.exports = ffmpegMock;
module.exports.default = ffmpegMock;
module.exports._setShouldSucceed = ffmpegMock._setShouldSucceed;
module.exports.ffprobe = ffmpegMock.ffprobe;
