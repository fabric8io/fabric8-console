var apimanUrl = UrlHelpers.join(Kubernetes.kubernetesApiPrefix(), Kubernetes.kubernetesNamespacePath(), "/services/apiman")
var APIMAN_CONFIG_DATA = {
    "apiman" : {
        "version" : "{{ .Env.APIMAN_VERSION : 1.1.1 }}",
        "builtOn" : "{{ .Env.APIMAN_BUILT_ON : fabric8 }}",
        "logoutUrl" : "/notavailable"
    },
    "user" : {
        "username" : "n/a"
    },
    "ui" : {
        "header" : false
    },
    "api" : {
        "endpoint" : apimanUrl,
        "auth" : {
            "type" : "none"
        }
    }
}
