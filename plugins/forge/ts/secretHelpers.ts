// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>

module Forge {

  const secretNamespaceKey = "fabric8SourceSecretNamespace";
  const secretNameKey = "fabric8SourceSecret";

  export function getSourceSecretNamespace(localStorage) {
    var secretNamespace = localStorage[secretNamespaceKey];
    var userName = Kubernetes.currentUserName();
    if (!secretNamespace) {
      secretNamespace = "user-secrets-source-" + userName;
    }
    return secretNamespace;
  }


  export function getProjectSourceSecret(localStorage, ns, projectId) {
    if (!ns) {
      ns = Kubernetes.currentKubernetesNamespace();
    }
    var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
    var sourceSecret = localStorage[secretKey];
    return sourceSecret;
  }

  export function setProjectSourceSecret(localStorage, ns, projectId, secretName) {
    var secretKey = createLocalStorageKey(secretNameKey, ns, projectId);
    localStorage[secretKey] = secretName;
  }

  export function parseUrl(url) {
    if (url) {
      var parser = document.createElement('a');
      parser.href = url;
      return parser;
    }
    return {
      protocol: "",
      host: ""
    };
  }

  function createLocalStorageKey(prefix, ns, name) {
    return prefix + "/" + ns + "/" + (name || "");
  }
}
