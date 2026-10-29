import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { analyze } from '../src/lib/ai/provider';
import { analyzeDemo } from '../src/lib/ai/demo';
import { defaultCourses } from '../src/lib/catalog';
import { demoConsultation } from '../src/lib/seed';
test('compatible provider validates JSON, rejects fabricated course IDs and never silently falls back', async () => {
  const previous = { ...process.env };
  let content: unknown = analyzeDemo(demoConsultation, defaultCourses);
  let requestBody: any;
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requestBody = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  try {
    process.env.AI_MODE = 'live';
    process.env.LLM_API_KEY = 'test-only';
    process.env.LLM_MODEL = 'test-model';
    process.env.LLM_BASE_URL = `http://127.0.0.1:${port}/v1`;
    const r = await analyze(demoConsultation, defaultCourses);
    assert.equal(r.engine, 'live');
    assert.equal(requestBody.response_format.type, 'json_schema');
    assert.match(requestBody.messages[0].content, /输入资料/);
    assert.equal(requestBody.model, 'test-model');
    content = {
      ...analyzeDemo(demoConsultation, defaultCourses),
      matches: [{ courseId: 'fabricated', fit: 90, reasons: ['fake'], risks: [] }],
    };
    await assert.rejects(() => analyze(demoConsultation, defaultCourses), /课程库/);
    content = { invalid: true };
    await assert.rejects(() => analyze(demoConsultation, defaultCourses), /结构校验/);
    delete process.env.LLM_API_KEY;
    await assert.rejects(() => analyze(demoConsultation, defaultCourses), /LLM_API_KEY/);
  } finally {
    process.env = previous;
    await new Promise<void>((r, e) => server.close((err) => (err ? e(err) : r())));
  }
});
