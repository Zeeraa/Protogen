import consoleStamp from 'console-stamp';
import swaggerAutogen from 'swagger-autogen';

consoleStamp(console);

const doc = {
    info: {
        version: 'v1.0.0',
        title: 'Protogen Remote Worker',
        description: 'Offloading heavy tasks to an external server'
    },
    servers: [
        {
            url: 'http://localhost:8123',
            description: 'Local development server'
        },
    ],
    components: {
    },
    tags: [
        {
            name: "Video downloader",
            description: "Download and prepare videos for playback on visor"
        },
    ],
    definitions: {
        VideoDownloaderJobDTO: {
            $url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            $mirrorVideo: true
        }
    }
};

const outputFile = '../swagger.json';
const endpointFiles = [
    './src/routes/video_downloader/VideoDownloaderRouter.ts',
];

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointFiles, doc);
