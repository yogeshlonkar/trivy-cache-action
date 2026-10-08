import "@actions/http-client";

import util from "util";

import * as trivyDBUtils from "../src/utils/trivyDBUtils";

const getJsonMock = jest.fn();
const headMock = jest.fn();

jest.mock("@actions/http-client", () => {
    return {
        Headers: {
            Accept: "accept",
            ContentType: "content-type"
        },
        HttpClient: jest.fn().mockImplementation(() => {
            return {
                getJson: getJsonMock,
                head: headMock
            };
        })
    };
});

const sha = "e44b2705ceaf49b138e884ba481db6672ecdca234a6c177e957bc5f1500d8e7f";

function manifest(statusCode: number, digest?: string) {
    const headers = digest ? { "docker-content-digest": digest } : {};
    return { message: { statusCode, headers } };
}

beforeAll(() => {
    process.env.GITHUB_ACTION_REPOSITORY = "yogeshlonkar/trivy-cache";
});

test("getLatestSHA256 returns the manifest digest from ghcr.io", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: { token: "anon" }
    });
    headMock.mockResolvedValueOnce(manifest(200, `sha256:${sha}`));

    await expect(trivyDBUtils.getLatestSHA256()).resolves.toBe(sha);
    expect(getJsonMock).toHaveBeenCalledWith(
        "https://ghcr.io/token?scope=repository:aquasecurity/trivy-db:pull"
    );
    expect(headMock).toHaveBeenCalledWith(
        "https://ghcr.io/v2/aquasecurity/trivy-db/manifests/latest",
        expect.objectContaining({ Authorization: "Bearer anon" })
    );
});

test("getLatestSHA256 throws when the token request fails", async () => {
    getJsonMock.mockResolvedValueOnce({ statusCode: 403, result: null });
    await expect(trivyDBUtils.getLatestSHA256()).rejects.toThrow(
        "unexpected status from ghcr.io token: 403"
    );
    getJsonMock.mockResolvedValueOnce({ statusCode: 200, result: {} });
    await expect(trivyDBUtils.getLatestSHA256()).rejects.toThrow(
        "unexpected status from ghcr.io token: 200"
    );
    expect(headMock).not.toHaveBeenCalled();
});

test("getLatestSHA256 throws when the manifest request fails", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: { token: "anon" }
    });
    headMock.mockResolvedValueOnce(manifest(404));
    await expect(trivyDBUtils.getLatestSHA256()).rejects.toThrow(
        "unexpected status from ghcr.io manifest: 404"
    );
});

test("getLatestSHA256 throws when no digest is returned", async () => {
    getJsonMock.mockResolvedValueOnce({
        statusCode: 200,
        result: { token: "anon" }
    });
    headMock.mockResolvedValueOnce(manifest(200));
    await expect(trivyDBUtils.getLatestSHA256()).rejects.toThrow(
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
    expect(exec).toHaveBeenNthCalledWith(
        1,
        `sh -c "type sudo 2>&1 >/dev/null"`
    );
    expect(exec).toHaveBeenNthCalledWith(
        2,
        "sudo chown -R $(stat . -c %u:%g) .trivy"
    );
});

test("fixPermissions runs without sudo chown", async () => {
    const exec = jest.fn();
    jest.spyOn(util, "promisify").mockImplementation(function () {
        return exec;
    });
    exec.mockRejectedValueOnce(new Error("exit 127"));
    await trivyDBUtils.fixPermissions();
    expect(exec).toHaveBeenNthCalledWith(
        1,
        `sh -c "type sudo 2>&1 >/dev/null"`
    );
    expect(exec).toHaveBeenNthCalledWith(
        2,
        "chown -R $(stat . -c %u:%g) .trivy"
    );
});
