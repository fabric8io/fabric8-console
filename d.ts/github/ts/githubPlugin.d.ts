/// <reference path="../../includes.d.ts" />
/// <reference path="githubHelpers.d.ts" />
declare module Github {
    var _module: ng.IModule;
    var controller: (name: string, inlineAnnotatedConstructor: any[]) => ng.IModule;
    var route: (templateName: string, reloadOnSearch?: boolean) => {
        templateUrl: string;
        reloadOnSearch: boolean;
    };
}
