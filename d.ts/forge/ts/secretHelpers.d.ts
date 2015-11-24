/// <reference path="forgeHelpers.d.ts" />
declare module Forge {
    function getSourceSecretNamespace(localStorage: any): any;
    function getProjectSourceSecret(localStorage: any, ns: any, projectId: any): any;
    function setProjectSourceSecret(localStorage: any, ns: any, projectId: any, secretName: any): void;
    function secretValid(secret: any, requiredDataKeys: any): boolean;
    function parseUrl(url: any): {
        protocol: string;
        host: string;
    };
}
