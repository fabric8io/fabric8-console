/// <reference path="../../includes.d.ts" />
/// <reference path="mainGlobals.d.ts" />
declare var OSOAuthConfig: Kubernetes.OpenShiftOAuthConfig;
declare var GoogleOAuthConfig: Kubernetes.GoogleOAuthConfig;
declare var KeycloakConfig: Kubernetes.KeyCloakAuthConfig;
declare module Main {
    var _module: ng.IModule;
}
