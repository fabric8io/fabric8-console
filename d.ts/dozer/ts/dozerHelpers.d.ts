/// <reference path="../../includes.d.ts" />
/// <reference path="model.d.ts" />
declare var io_hawt_dozer_schema_Field: any;
declare var io_hawt_dozer_schema_Mapping: any;
declare module Dozer {
    var pluginName: string;
    var templatePath: string;
    var log: Logging.Logger;
    var jmxDomain: string;
    var introspectorMBean: string;
    var excludedPackages: string[];
    var elementNameMappings: {
        "Mapping": string;
        "MappingClass": string;
        "Field": string;
    };
    function loadDozerModel(xml: any, pageId: string): Mappings;
    function saveToXmlText(model: Mappings): string;
    function findUnmappedFields(workspace: Workspace, mapping: Mapping, fn: any): void;
    function findProperties(workspace: Workspace, className: string, filter?: string, fn?: any): any[];
    function findClassNames(workspace: Workspace, searchText: string, limit?: number, fn?: any): any[];
    function getIntrospectorMBean(workspace: Workspace): string;
    function loadModelFromTree(rootTreeNode: any, oldModel: Mappings): Mappings;
    function createDozerTree(model: Mappings): Folder;
    function createMappingFolder(mapping: any, parentFolder: any): Folder;
    function addMappingFieldFolder(field: any, mappingFolder: any): Folder;
    function appendAttributes(object: any, element: any, ignorePropertyNames: string[]): void;
    function appendElement(object: any, element: any, elementName?: string, indentLevel?: number): any;
    function nameOf(object: any): any;
    function addTextNode(element: any, text: string): void;
}
