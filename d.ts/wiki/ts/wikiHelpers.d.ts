/// <reference path="../../includes.d.ts" />
declare module Wiki {
    var log: Logging.Logger;
    var camelNamespaces: string[];
    var springNamespaces: string[];
    var droolsNamespaces: string[];
    var dozerNamespaces: string[];
    var activemqNamespaces: string[];
    var excludeAdjustmentPrefixes: string[];
    enum ViewMode {
        List = 0,
        Icon = 1,
    }
    var customWikiViewPages: string[];
    var hideExtensions: string[];
    interface GenerateOptions {
        workspace: any;
        form: any;
        name: string;
        branch: string;
        parentId: string;
        success: (fileContents?: string) => void;
        error: (error: any) => void;
    }
    var documentTemplates: ({
        label: string;
        tooltip: string;
        folder: boolean;
        icon: string;
        exemplar: string;
        regex: RegExp;
        invalid: string;
    } | {
        label: string;
        tooltip: string;
        exemplar: string;
        regex: RegExp;
        invalid: string;
        extension: string;
    } | {
        label: string;
        tooltip: string;
        children: {
            label: string;
            tooltip: string;
            icon: string;
            exemplar: string;
            regex: RegExp;
            invalid: string;
            extension: string;
        }[];
    })[];
    function isFMCContainer(workspace: any): boolean;
    function isWikiEnabled(workspace: any, jolokia: any, localStorage: any): boolean;
    function goToLink(link: any, $timeout: any, $location: any): void;
    function customViewLinks($scope: any): string[];
    function createWizardTree(workspace: any, $scope: any): any;
    function addCreateWizardFolders(workspace: any, $scope: any, parent: any, templates: any[]): void;
    function startLink($scope: any): string;
    function isIndexPage(path: string): boolean;
    function viewLink($scope: any, pageId: string, $location: any, fileName?: string): string;
    function branchLink($scope: any, pageId: string, $location: any, fileName?: string): string;
    function editLink($scope: any, pageId: string, $location: any): string;
    function createLink($scope: any, pageId: string, $location: any): string;
    function encodePath(pageId: string): string;
    function decodePath(pageId: string): string;
    function fileFormat(name: string, fileExtensionTypeRegistry?: any): any;
    function fileName(path: string): string;
    function fileParent(path: string): string;
    function hideFileNameExtensions(name: any): any;
    function gitRestURL($scope: any, path: string): string;
    function gitRelativeURL($scope: any, path: string): string;
    function fileIconHtml(row: any): string;
    function iconClass(row: any): string;
    function initScope($scope: any, $routeParams: any, $location: any): void;
    function loadBranches(jolokia: any, wikiRepository: any, $scope: any, isFmc?: boolean): void;
    function pageId($routeParams: any, $location: any): any;
    function pageIdFromURI(url: string): string;
    function fileExtension(name: any): string;
    function onComplete(status: any): void;
    function parseJson(text: string): any;
    function adjustHref($scope: any, $location: any, href: any, fileExtension: any): string;
}
