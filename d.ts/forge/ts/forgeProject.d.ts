/// <reference path="../../includes.d.ts" />
/// <reference path="forgeHelpers.d.ts" />
declare module Forge {
    function updateForgeProject($scope: any): void;
    function forgeProject(): any;
    function forgeProjectHasBuilder(name: any): any;
    function forgeProjectHasPerspective(name: any): any;
    class ForgeProjectService {
        projectId: string;
        namespace: string;
        overview: any;
        $scope: any;
        hasBuilder(name: any): boolean;
        hasPerspective(name: any): boolean;
        updateProject($scope: any): void;
        clearCache(): void;
    }
}
