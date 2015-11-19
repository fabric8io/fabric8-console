/// <reference path="forgeHelpers.d.ts" />
declare module Forge {
    function getSourceSecretNamespace(localStorage: any): any;
    function getProjectSourceSecret(localStorage: any, ns: any, projectId: any): any;
    function setProjectSourceSecret(localStorage: any, ns: any, projectId: any, secretName: any): void;
}
