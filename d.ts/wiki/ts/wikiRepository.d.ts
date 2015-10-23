/// <reference path="../../includes.d.ts" />
/// <reference path="wikiHelpers.d.ts" />
/// <reference path="wikiPlugin.d.ts" />
declare module Wiki {
    class GitWikiRepository {
        directoryPrefix: string;
        private $http;
        private config;
        private baseUrl;
        constructor($scope: any);
        getPage(branch: string, path: string, objectId: string, fn: any): void;
        putPage(branch: string, path: string, contents: string, commitMessage: string, fn: any): void;
        history(branch: string, objectId: string, path: string, limit: number, fn: any): void;
        commitInfo(commitId: string, fn: any): void;
        commitTree(commitId: string, fn: any): void;
        diff(objectId: string, baseObjectId: string, path: string, fn: any): void;
        branches(fn: any): void;
        exists(branch: string, path: string, fn: any): Boolean;
        revertTo(branch: string, objectId: string, blobPath: string, commitMessage: string, fn: any): void;
        rename(branch: string, oldPath: string, newPath: string, commitMessage: string, fn: any): void;
        removePage(branch: string, path: string, commitMessage: string, fn: any): void;
        removePages(branch: string, paths: Array<string>, commitMessage: string, fn: any): void;
        private doGet(path, query, successFn, errorFn?, config?);
        private doPost(path, query, body, successFn, errorFn?);
        private doPostForm(path, query, body, successFn, errorFn?);
        completePath(branch: string, completionText: string, directoriesOnly: boolean, fn: any): void;
        getPath(path: string): string;
        getLogPath(path: string): string;
        getContent(objectId: string, blobPath: string, fn: any): void;
        jsonChildContents(path: string, nameWildcard: string, search: string, fn: any): void;
        git(): void;
    }
}
