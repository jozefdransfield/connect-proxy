var connect = require('connect')
  , assert = require('assert')
  , longjohn = require('longjohn')
  , proxy = require('../');

describe("proxy", function() {
  it("http -> https", function(done) {
    testWith('http', 'https', done);
  });

  it("https -> http", function(done) {
    testWith('https', 'http', done);
  });

  it("http -> http", function(done) {
    testWith('http', 'http', done);
  });

  it("https -> https", function(done) {
    testWith('https', 'https', done);
  });
});

function testWith (srcLibName, destLibName, cb) {
  var srcHttp = require(srcLibName);
  var destHttp = require(destLibName);

  var destServer = destHttp.createServer(function(req, resp) {
    assert.strictEqual(req.method, 'GET');
    assert.strictEqual(req.headers['x-custom-header'], 'hello');
    assert.strictEqual(req.url, '/api/a/b/c/d');
    resp.statusCode = 200;
    resp.setHeader('x-custom-reply', "la la la");
    resp.write('this is your body.');
    resp.end();
  });
  destServer.listen(0, 'localhost', function() {
    var app = connect();
    var destEndpoint = destLibName + "://localhost:" + destServer.address().port + "/api";
    app.use(proxy(destEndpoint));
    var srcServer = srcHttp.createServer(app);
    srcServer.listen(0, 'localhost', function() {
      // make client request to proxy server
      var srcRequest = srcHttp.request({
        port: srcServer.address().port,
        method: "GET",
        path: "/a/b/c/d",
        headers: {
          "x-custom-header": "hello"
        },
      }, function (resp) {
        var buffer = "";
        assert.strictEqual(resp.statusCode, 200);
        assert.strictEqual(resp.headers['x-custom-reply'], 'la la la');
        resp.setEncoding('utf8');
        resp.on('data', function(data) {
          buffer += data;
        });
        resp.on('end', function() {
          assert.strictEqual(buffer, 'this is your body.');
          srcServer.close()
          destServer.close();
          cb();
        });
      });
      srcRequest.end();
    });
  });
}