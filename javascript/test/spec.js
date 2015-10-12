/*jslint loopfunc:true*/
/*globals describe, it, expect, TT, sinon, afterEach, beforeEach, jasmine, window, JSON, md5, console, spyOn*/
var GLOBAL = this;
var TOKEN = 'test_token';
var initConfig = {
    token: TOKEN,
    secret: 'test_secret',
    userId: 'test',
    userName: 'tester',
    build: '1.2',
    sessionId: 'session-test'
};

function destroy(){
    TT.destroy('default');
    TT.destroy(TOKEN);
}
function mockXMLHttpRequests(){
    // Prevent requests
    this.xhr = sinon.useFakeXMLHttpRequest();

    // List requests
    var requestList = this.requestList = [];

    this.xhr.onCreate = function(request){
        requestList.push(request);
    };
}
function addGetJson(){
    this.getXhrJson = function(xhrRequestId) {
        return JSON.parse(this.requestList[xhrRequestId].requestBody);
    };
}
function restoreXMLHttpRequests(){
    if(this.xhr){
        this.xhr.restore();
    }
}

function clone(obj) {
    var excludes = Array.prototype.slice.call(arguments, 1);
    var res = {};
    for (var k in obj) {
        if (excludes.indexOf(k) === -1) {
            res[k] = obj[k];
        }
    }
    return res;
}


describe('construction', function () {

    it('with options', function () {
        expect(TT.init(initConfig)).toBe(true);
    });

    // TODO: Test Raul's multi logger

    describe('fails', function () {
        it('without options', function () {
            expect(TT.init).toThrow("Invalid parameters for init()");
        });

        ['token', 'secret', 'userId', 'userName', 'build', 'sessionId'].forEach(function(key) {
            it('without ' + key, function() {
                expect(function() {
                    TT.init(clone(initConfig, key));    
                }).toThrow(key + ' is required and should be a string');
            });
        });

    });

    afterEach(destroy);
});

describe('sending headers', function() {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        TT.init(initConfig);
    });

    it('sends X-Product-Key as header', function() {
        TT.log('test.event', {});

        expect(this.requestList[0].requestHeaders['X-Product-Key']).toBe(TOKEN);
    });

    it('sends X-Product-Auth as header', function() {
        TT.log('test.event', {});

        var request = this.requestList[0];
        var hash = md5(request.requestBody + initConfig.secret);

        expect(this.requestList[0].requestHeaders['X-Product-Auth']).toBe(hash);
    });

    it('sends Content-type as "application/json;charset=utf-8"', function() {
        TT.log('test.event', {});

        expect(this.requestList[0].requestHeaders['Content-type']).toBe('application/json;charset=utf-8');
    });

    afterEach(restoreXMLHttpRequests);
    afterEach(destroy);
});

describe('sending common information', function() {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        TT.init(initConfig);
    });

    it('logs clientTimestamp as format of 2012–03–14T02:33:42.416587+00:00', function() {
        TT.log('test.event', {});

        expect(this.getXhrJson(0)[0].clientTimestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}[+-]\d{2}:\d{2}/);
    });

    it('logs device as format of "Browser: $userAgent$" if not provided', function() {
        TT.log('test.event', {});

        expect(this.getXhrJson(0)[0].device).toMatch(/^Browser: /);
    });

    it('logs build as init options', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].build).toBe('1.2');
    });

    it('logs userId as init options', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].userId).toBe('test');
    });

    it('logs userName as init options', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].userName).toBe('tester');
    });

    it('logs sessionId as init options', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].sessionId).toBe('session-test');
    });    

    afterEach(restoreXMLHttpRequests);
    afterEach(destroy);
});

describe('sending messages', function () {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        TT.init(initConfig);
        spyOn(console, 'warn');
    });

    describe('fails', function() {
        it('without arguments', function() {
            expect(TT.log).toThrow('No arguments!');
        });

        it('without event type as string', function() {
            expect(function() {
                TT.log(123, {});
            }).toThrow('Event type is required and should be string');
        });
    });

    it('logs event type', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('logs clientTimestamp as format of 2012–03–14T02:33:42.416587+00:00', function() {
        TT.log('test.event', {});

        expect(this.getXhrJson(0)[0].clientTimestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}[+-]\d{2}:\d{2}/);
    });

    it('logs device as format of "Browser: $userAgent$"', function() {
        TT.log('test.event', {});

        expect(this.getXhrJson(0)[0].device).toMatch(/^Browser: /);
    });

    it('logs event data correctly', function() {
        TT.log('test.data', {
            random: 1
        });
        expect(this.getXhrJson(0)[0].data).toEqual({ random: 1});
    });

    it('logs null values', function(){
        TT.log('null_event', null);

        expect(this.requestList[0]).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith("null_event won't be sent since event is not an object");
    });

    it('logs undefined values', function(){
        TT.log('undefined_event', undefined);

        expect(this.requestList[0]).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith("undefined_event won't be sent since event is not an object");
    });

    it('logs object with nullish properties', function(){
        TT.log('nullish_event', {
            undef: undefined,
            nullVal: null
        });

        var event = this.getXhrJson(0)[0].data;
        expect(event.undef).toBe('undefined');
        expect(event.nullVal).toBe(null);
    });

    it('logs array with nullish values', function(){
        TT.log('array', [
            undefined,
            null
        ]);

        expect(this.requestList[0]).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith("array won't be sent since event is not an object");
    });

    it('has no location field by default', function(){
        TT.log('test.event', {price: 1});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
    });

    it('sends a full json correctly', function(){
        TT.log('test.event', {price: 1, color: "red", user: { name: "Jeff" }, item_ids: [1, 2, 3, 4, 5]});
        expect(this.getXhrJson(0)[0].data).toEqual({
            price: 1,
            color: "red",
            user: { name: "Jeff" },
            item_ids: [1, 2, 3, 4, 5]
        });

        expect(this.getXhrJson(0)[0].userId).toEqual('test');
        expect(this.getXhrJson(0)[0].userName).toEqual('tester');
        expect(this.getXhrJson(0)[0].build).toEqual('1.2');
        expect(this.getXhrJson(0)[0].sessionId).toEqual('session-test');
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
    });

    afterEach(destroy);
});

describe('sends log level', function(){
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        TT.init(initConfig);
    });

    it('excludes cyclic values', function(){
        var a = {};
        a.b = a;

        TT.log('cyclic', a);

        expect(this.getXhrJson(0)[0].data.b).toBe('<?>');
    });

    afterEach(restoreXMLHttpRequests);
    afterEach(destroy);
});

describe('destroys log streams', function () {
    it('default', function () {
        TT.init(initConfig);
        TT.destroy();

        expect(function(){
            TT.init(initConfig);
        }).not.toThrow();
    });

    it('custom name', function () {
        var testConfig = {};
        for (var k in initConfig) {
            testConfig[k] = initConfig[k];
        }
        testConfig.name = 'test';

        TT.init(testConfig);
        TT.destroy('test');

        expect(function(){
            TT.init(testConfig);
        }).not.toThrow();
    });

    afterEach(restoreXMLHttpRequests);
    afterEach(destroy);
});

describe('custom endpoint', function () {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        window.TTENDPOINT = 'somwhere.com/custom-logging';
        TT.init(initConfig);
    });
    
    it('can be set', function () {
        TT.log('type', {});
        var lastReq = this.requestList[1]; //no idea why its sending two messages
        
        expect(lastReq.url).toBe('http://somwhere.com/custom-logging');
    });
    
    afterEach(restoreXMLHttpRequests);
    afterEach(destroy);
});

describe('sending messages with location', function () {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        var initConfigWithLatlng = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 34.551811,
            longitude: 100.843506
        };
        TT.init(initConfigWithLatlng);
        spyOn(console, 'warn');
    });

    describe('fails', function() {
        it('without arguments', function() {
            expect(TT.log).toThrow('No arguments!');
        });

        it('without event type as string', function() {
            expect(function() {
                TT.log(123, {});
            }).toThrow('Event type is required and should be string');
        });
    });

    it('logs location', function() {
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location.lat).toBe(34.551811);
        expect(this.getXhrJson(0)[0].location.lon).toBe(100.843506);
    });

    afterEach(destroy);
});

describe('sending messages with a config of only latitude or longitude will not send location', function () {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        spyOn(console, 'warn');
    });

    it('sending only latitude will not send location', function() {
        var initConfigWithLatOnly = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 34.551811
        };
        TT.init(initConfigWithLatOnly);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
    });

    it('sending only longitude will not send location', function() {
        var initConfigWithLngOnly = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            longitude: 100.843506
        };
        TT.init(initConfigWithLngOnly);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
    });

    afterEach(destroy);
});

describe('sending messages with string locations is fine if they parse into actual floats', function () {
    beforeEach(mockXMLHttpRequests);
    beforeEach(addGetJson);
    beforeEach(function() {
        spyOn(console, 'warn');
    });

    it('sending a string latitude that can be parsed as a float is valid', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: '34.551811',
            longitude: 100.843506
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location.lat).toBe(34.551811);
        expect(this.getXhrJson(0)[0].location.lon).toBe(100.843506);
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('sending a string longitude that can be parsed as a float is valid', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 34.551811,
            longitude: '100.843506'
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location.lat).toBe(34.551811);
        expect(this.getXhrJson(0)[0].location.lon).toBe(100.843506);
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('sending a string longitude and latitude that can be parsed as floats is valid', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: '34.551811',
            longitude: '100.843506'
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location.lat).toBe(34.551811);
        expect(this.getXhrJson(0)[0].location.lon).toBe(100.843506);
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('sending a NaN latitude will not send the location', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 'this will not send the location field',
            longitude: '100.843506'
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('sending a NaN longitude will not send the location', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 34.551811,
            longitude: 'this will not send the location field'
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    it('sending both NaN longitude and latitude will not send the location', function() {
        var config = {
            token: TOKEN,
            secret: 'test_secret',
            userId: 'test',
            userName: 'tester',
            build: '1.2',
            sessionId: 'session-test',
            latitude: 'this will not send the location field',
            longitude: 'this will not send the location field'
        };
        TT.init(config);
        TT.log('test.event', {});
        expect(this.getXhrJson(0)[0].location).toBeUndefined();
        expect(this.getXhrJson(0)[0].eventType).toBe('test.event');
    });

    afterEach(destroy);
});
