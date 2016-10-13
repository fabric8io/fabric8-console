/// <reference path="../../includes.d.ts" />
/// <reference path="../../forge/ts/forgeHelpers.d.ts" />
/// <reference path="mainGlobals.d.ts" />
declare module Main {
    var _module: ng.IModule;
    var route: (templateName: string, reloadOnSearch?: boolean) => {
        templateUrl: string;
        reloadOnSearch: boolean;
    };
}
