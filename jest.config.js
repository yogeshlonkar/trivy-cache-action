require("nock").disableNetConnect();

module.exports = {
    clearMocks: true,
    moduleFileExtensions: ["js", "ts"],
    testEnvironment: "node",
    testMatch: ["**/*.test.ts"],
    testRunner: "jest-circus/runner",
    // @actions/* are ESM-only from core 3 and cache 6 and export only an
    // `import` condition, which jest's CommonJS resolver can't see. Point the
    // specifiers at their files and let ts-jest compile them to CommonJS.
    // ncc bundles them for dist/ without any of this.
    moduleNameMapper: {
        "^@actions/http-client$":
            "<rootDir>/node_modules/@actions/http-client/lib/index.js",
        "^@actions/([a-z-]+)$": "<rootDir>/node_modules/@actions/$1/lib/$1.js",
        "^@actions/([a-z-]+)/lib/([a-z-]+)$":
            "<rootDir>/node_modules/@actions/$1/lib/$2.js"
    },
    transform: {
        "^.+\\.ts$": "ts-jest",
        "^.+/node_modules/@actions/.+\\.js$": [
            "ts-jest",
            { tsconfig: { allowJs: true }, diagnostics: false }
        ]
    },
    transformIgnorePatterns: ["/node_modules/(?!@actions/)"],
    verbose: true
};

const processStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (str, encoding, cb) => {
    // Core library will directly call process.stdout.write for commands
    // We don't want :: commands to be executed by the runner during tests
    if (!String(str).match(/^::/)) {
        return processStdoutWrite(str, encoding, cb);
    }
};
