import "@actions/http-client";

import util from "util";

import * as trivyDBUtils from "../src/utils/trivyDBUtils";
import versions from "./__fixtures__/versions.json";

const getJsonMock = jest.fn();

jest.mock("@actions/http-client", () => {
    return {
        Headers: {
            Accept: "accept",
            ContentType: "content-type"
        },
        HttpClient: jest.fn().mockImplementation(() => {
            return {
                getJson: getJsonMock
            };
        })
    };
});

beforeAll(() => {
    process.env.GITHUB_TOKEN = "some-token";
    process.env.GITHUB_ACTION_REPOSITORY = "yogeshlonkar/trivy-cache";
});

test("getLatestSHA256 returns sha", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: versions
    });
    const sha = await trivyDBUtils.getLatestSHA256("gh-token-123");
    expect(sha).toBe(
        "db2b8a314cec79eb465a45de6dc8df12d1b45be8fd8f2fabcb472937a4be8bc5"
    );
});

test("getLatestSHA256 throws error when status >200", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 404
    });
    await expect(trivyDBUtils.getLatestSHA256("gh-token-123")).rejects.toThrow(
        "unexpected status from api.github.com: 404"
    );
});

test("getLatestSHA256 throws error when no sha found", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: []
    });
    await expect(trivyDBUtils.getLatestSHA256("gh-token-123")).rejects.toThrow(
        "could not find latest trivy db sha"
    );
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: null
    });
    await expect(trivyDBUtils.getLatestSHA256("gh-token-123")).rejects.toThrow(
        "could not find latest trivy db sha"
    );
});

test("fixPermissions runs sudo chown", async () => {
    const exec = jest.fn();
    jest.spyOn(util, "promisify").mockImplementation(function () {
        return exec;
    });
    exec.mockReturnValueOnce("");
    await trivyDBUtils.fixPermissions();
    expect(exec).nthCalledWith(1, `sh -c "type sudo 2>&1 >/dev/null"`);
    expect(exec).nthCalledWith(2, "sudo chown -R $(stat . -c %u:%g) .trivy");
});

test("fixPermissions runs without sudo chown", async () => {
    const exec = jest.fn();
    jest.spyOn(util, "promisify").mockImplementation(function () {
        return exec;
    });
    exec.mockRejectedValueOnce(new Error("exit 127"));
    await trivyDBUtils.fixPermissions();
    expect(exec).nthCalledWith(1, `sh -c "type sudo 2>&1 >/dev/null"`);
    expect(exec).nthCalledWith(2, "chown -R $(stat . -c %u:%g) .trivy");
});
