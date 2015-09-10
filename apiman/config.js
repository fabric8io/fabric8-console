// For the API Management tab to appear you will need to run elastic, apiman in the current namespace
// Note that platform is set up 'fabric8' and the endpoint is set to 'dynamicRoute'.
// Dynamic Options:
// - dynamicRoute - looks up the ha-proxy endpoint for apiman in the current namespace
// - dynamicServiceUrl - looks up the kubernetes service endpoint url in the current namespace
// - dynamicProxyUrl - looks up the kubenetes proxy endpoint url in the current namespace
// Static
// alternatively you can point it a apiman url statically
var APIMAN_CONFIG_DATA = {
    "apiman" : {
        "version" : "1.1.1",
        "builtOn" : "fabric8",
        "logoutUrl" : "/notavailable"
    },
    "user" : {
        "username" : "n/a"
    },
    "ui" : {
        "header" : false
    },
    "api" : {
        "endpoint" : "dynamicRoute",
        "auth" : {
            "type" : "none"
        }
    },
    "platform" : "fabric8"
}
