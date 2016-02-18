/// <reference path="../../includes.d.ts" />
/// <reference path="forgeHelpers.d.ts" />
declare module Forge {
    function updateForgeProject($scope: any): void;
    function forgeProject(): ForgeProjectService;
    function forgeProjectHasBuilder(name: any): boolean;
    function forgeProjectHasPerspective(name: any): boolean;
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
