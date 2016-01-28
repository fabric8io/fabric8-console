/// <reference path="../../includes.d.ts" />
/// <reference path="forgeHelpers.d.ts" />
declare module Forge {
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
