const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(require('node:path').join(__dirname, '../memory-api.js'), 'utf8');
const primary = 'https://memory.example/api';
const secondary = 'https://other.example/api';
const token = 'A'.repeat(43);
const key = base => 'lp_memory_session_v1:' + base;

function setup(handler, initial = {}, storageFails = false) {
    const storage = new Map(Object.entries(initial));
    const calls = [];
    const context = {
        URL, Headers, AbortController,
        location: { href: 'https://little-prince.xyz/' },
        window: { setTimeout, clearTimeout },
        localStorage: {
            getItem(k) { if (storageFails) throw Error('storage disabled'); return storage.get(k) || null; },
            setItem(k, value) { if (storageFails) throw Error('storage disabled'); storage.set(k, value); }
        },
        async fetch(url, options) {
            calls.push({ url, options });
            const result = await handler(url, options);
            return { ok: result.status < 400, status: result.status, json: async () => result.body };
        }
    };
    vm.runInNewContext(source, context);
    return { client: context.window.createMemoryClient([primary, secondary], x => x), calls, storage };
}

function normal(url) {
    return { status: url.endsWith('/session') ? 201 : 200,
        body: url.endsWith('/session') ? { authVersion: 1, sessionToken: token } : { emotion: 'neutral' } };
}

test('simultaneous memory calls share one session and keep the token out of URLs', async () => {
    const { client, calls, storage } = setup(normal);
    await Promise.all([client.request('/profile'), client.request('/conversations/me')]);
    assert.equal(calls.filter(c => c.url.endsWith('/session')).length, 1);
    for (const call of calls.filter(c => !c.url.endsWith('/session'))) {
        assert.equal(call.options.headers.get('Authorization'), 'Bearer ' + token);
        assert.ok(call.url.startsWith(primary));
        assert.ok(!call.url.includes(token));
        assert.ok(!call.url.includes('visitorId'));
    }
    assert.equal(JSON.parse(storage.get(key(primary))).sessionToken, token);
});

test('saved session survives reload and cannot redirect a credential to another base', async () => {
    const { client, calls } = setup(normal, {
        [key(primary)]: JSON.stringify({sessionToken: token, base: secondary})
    });
    await client.request('/profile');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, primary + '/profile');
});

for (const status of [401, 503]) {
    test(`HTTP ${status} with a stored session never retries another service or replaces identity`, async () => {
        const { client, calls } = setup(() => ({ status }), {[key(primary)]:JSON.stringify({sessionToken:token})});
        await assert.rejects(client.request('/profile'), error => error.status === status);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, primary + '/profile');
    });
}

test('an old service cannot cause unauthenticated reads of private data', async () => {
    const { client, calls } = setup(() => ({status:200, body:{conversationId:1}}), {lp_visitor_id:'legacy'});
    await assert.rejects(client.request('/conversations/me'));
    assert.ok(calls.every(c => c.url.endsWith('/session')));
    assert.ok(calls.every(c => !c.options.body));
});

test('fallback is allowed only before a credential is issued', async () => {
    const { client, calls } = setup(url => url.startsWith(primary) ? {status:404} : normal(url));
    await client.request('/profile');
    assert.equal(calls[2].url, secondary + '/profile');
    assert.equal(calls[2].options.headers.get('Authorization'), 'Bearer ' + token);
    assert.equal(calls[0].options.headers, undefined);
});

test('disabled storage still permits one in-memory session without repeated creation', async () => {
    const { client, calls } = setup(normal, {}, true);
    await client.request('/profile');
    await client.request('/profile');
    assert.equal(calls.filter(c => c.url.endsWith('/session')).length, 1);
});

test('a failed bootstrap can be retried later', async () => {
    let available = false;
    const { client } = setup(url => available ? normal(url) : {status:503});
    await assert.rejects(client.request('/profile'));
    available = true;
    await client.request('/profile');
});
