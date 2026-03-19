"use strict";

// Real integration tests - mocks OpenAI + fetch, imports actual postBlog handler
// mockChatCreate/mockImagesGenerate start with "mock" - babel-jest allows these in factory

const mockChatCreate = jest.fn();
const mockImagesGenerate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: { completions: { create: mockChatCreate } },
    images: { generate: mockImagesGenerate },
  })),
}));

const handler = require("../pages/api/postBlog").default;

// ── helpers ───────────────────────────────────────────────────────────────────

function mockRes() {
  const r = { _status: null, _body: null, _headers: {} };
  r.status = (code) => {
    r._status = code;
    return r;
  };
  r.json = (body) => {
    r._body = body;
    return r;
  };
  r.setHeader = (k, v) => {
    r._headers[k] = v;
    return r;
  };
  return r;
}

function mockReq(overrides = {}) {
  return {
    method: "GET",
    headers: {},
    cookies: { site_auth: "1" },
    query: {},
    body: {},
    ...overrides,
  };
}

const FAKE_HTML =
  "<h1>The Perfect Personalized Song Gift</h1><p>Content here.</p>";
const FAKE_TITLE = "The Perfect Personalized Song Gift";

function setupOpenAIMocks({ failImage = true } = {}) {
  mockChatCreate.mockResolvedValue({
    choices: [{ message: { content: FAKE_HTML } }],
  });
  if (failImage) {
    mockImagesGenerate.mockRejectedValue(new Error("Image skipped in test"));
  } else {
    mockImagesGenerate.mockResolvedValue({
      data: [{ b64_json: Buffer.alloc(4).toString("base64") }],
    });
  }
}

function setupFetch({
  slugEmpty = true,
  mediaId = 99,
  postId = 42,
  failPost = false,
} = {}) {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes("/posts?slug=")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            slugEmpty ? [] : [{ id: 1, link: "https://example.com/old" }],
          ),
      });
    }
    if (url.includes("/media")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: mediaId,
            source_url: "https://example.com/img.png",
          }),
      });
    }
    if (url.includes("/posts")) {
      if (failPost)
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("WP down"),
        });
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: postId,
            link: "https://example.com/blog/post",
          }),
      });
    }
    return Promise.reject(new Error("Unexpected fetch: " + url));
  });
}

beforeEach(() => {
  process.env.WP_API_URL = "https://makesongforme.com/wp-json/wp/v2";
  process.env.WP_USER = "Dev.John";
  process.env.WP_PASS = "testpass";
  process.env.NODE_ENV = "production";
  mockChatCreate.mockReset();
  mockImagesGenerate.mockReset();
});

afterEach(() => {
  delete global.fetch;
});

// ── method validation ─────────────────────────────────────────────────────────

describe("postBlog handler - method validation", () => {
  test("returns 405 for PUT", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "PUT" }), res);
    expect(res._status).toBe(405);
    expect(res._body.error).toBe("Method Not Allowed");
  });

  test("returns 405 for DELETE", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "DELETE" }), res);
    expect(res._status).toBe(405);
  });

  test("accepts GET requests", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq({ method: "GET" }), res);
    expect(res._status).not.toBe(405);
  });

  test("accepts POST requests", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq({ method: "POST" }), res);
    expect(res._status).not.toBe(405);
  });
});

// ── authorization ─────────────────────────────────────────────────────────────

describe("postBlog handler - authorization", () => {
  test("returns 401 when no auth in production", async () => {
    const res = mockRes();
    await handler(mockReq({ cookies: {}, headers: {}, query: {} }), res);
    expect(res._status).toBe(401);
  });

  test("returns 401 for wrong secret", async () => {
    const res = mockRes();
    await handler(
      mockReq({ cookies: {}, headers: {}, query: { secret: "wrongsecret" } }),
      res,
    );
    expect(res._status).toBe(401);
  });

  test("allows request with correct secret", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(
      mockReq({
        cookies: {},
        headers: {},
        query: { secret: "mySuperSecretKey" },
      }),
      res,
    );
    expect(res._status).toBe(200);
  });

  test("allows request with site_auth cookie", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq({ cookies: { site_auth: "1" } }), res);
    expect(res._status).toBe(200);
  });

  test("allows cron header without secret", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(
      mockReq({ cookies: {}, headers: { "x-vercel-cron": "1" }, query: {} }),
      res,
    );
    expect(res._status).toBe(200);
  });
});

// ── successful post creation ──────────────────────────────────────────────────

describe("postBlog handler - successful post creation", () => {
  test("returns 200 with post id and link", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.id).toBe(42);
    expect(res._body.link).toBe("https://example.com/blog/post");
  });

  test("posts to WordPress with the extracted title", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).title).toBe(FAKE_TITLE);
  });

  test("slug is prefixed with personalized-song-ideas", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).slug).toMatch(
      /^personalized-song-ideas-/,
    );
  });

  test("post status is publish", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).status).toBe("publish");
  });

  test("includes featured_media when image succeeds", async () => {
    setupOpenAIMocks({ failImage: false });
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).featured_media).toBe(99);
  });
});

// ── image failure graceful degradation ───────────────────────────────────────

describe("postBlog handler - image failure graceful degradation", () => {
  test("still publishes when image generation fails", async () => {
    setupOpenAIMocks({ failImage: true });
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
  });

  test("posts without featured_media when image fails", async () => {
    setupOpenAIMocks({ failImage: true });
    setupFetch();
    const res = mockRes();
    await handler(mockReq(), res);
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).featured_media).toBeUndefined();
  });
});

// ── cron vs manual slug behavior ─────────────────────────────────────────────

describe("postBlog handler - cron vs manual slug", () => {
  test("cron request: stable daily slug (no time suffix)", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(
      mockReq({ cookies: {}, headers: { "x-vercel-cron": "1" }, query: {} }),
      res,
    );
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).slug).toMatch(
      /^personalized-song-ideas-\d{4}-\d{2}-\d{2}$/,
    );
  });

  test("manual GET: slug includes time component", async () => {
    setupOpenAIMocks();
    setupFetch();
    const res = mockRes();
    await handler(
      mockReq({ cookies: { site_auth: "1" }, headers: {}, query: {} }),
      res,
    );
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).slug).toMatch(
      /^personalized-song-ideas-\d{4}-\d{2}-\d{2}-\d+$/,
    );
  });

  test("cron with existing slug: appends -cron- suffix", async () => {
    setupOpenAIMocks();
    setupFetch({ slugEmpty: false });
    const res = mockRes();
    await handler(
      mockReq({ cookies: {}, headers: { "x-vercel-cron": "1" }, query: {} }),
      res,
    );
    const wpPost = global.fetch.mock.calls.find(
      ([u]) => u.endsWith("/posts") && !u.includes("?slug="),
    );
    expect(JSON.parse(wpPost[1].body).slug).toMatch(/-cron-/);
  });
});

// ── WordPress errors ──────────────────────────────────────────────────────────

describe("postBlog handler - WordPress errors", () => {
  test("returns 500 when WP post creation fails", async () => {
    setupOpenAIMocks({ failImage: true });
    setupFetch({ failPost: true });
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._status).toBe(500);
  });

  test("returns 500 when WP_API_URL is not configured", async () => {
    delete process.env.WP_API_URL;
    setupOpenAIMocks({ failImage: true });
    global.fetch = jest.fn();
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._status).toBe(500);
  });
});
