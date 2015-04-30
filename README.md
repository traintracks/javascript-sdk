# javascript-sdk
Traintracks Javascript SDK

# Usage

## Javascript
* Include javascript/production/sdk[-min].js
* Run `TT.init(options: Object)` to intialize SDK
* Run `TT.log(eventType: String, data: Object)` to send your event to Traintracks

### Options
* `token: String` _required_ your product key
* `secret: String` _required_ your product secret
* `build: String` _required_ your product version
* `userId: String` _required_ current user ID
* `userName: String` _required_ current user name
* `sessionId: String` _required_ session's ID
* `device: String` _optional_ device info, navigator.userAgent is used by default
* `endpoint: URL` _optional_ server endpoint, default is **http://api.traintracks.io/v1/events**
* `print: Boolean` _optional_ if print your event by console.log, **false** by default
* `dry: Boolean` _optional_ if bypass underlying requests, convenient for debugging, **false** by default
