/// <reference path="../../includes.d.ts" />
declare module Wiki {
    function createSourceBreadcrumbs($scope: any): {
        label: string;
        class: string;
        href: any;
        title: string;
    }[];
    function createEditingBreadcrumb($scope: any): {
        label: string;
        title: string;
    };
}
