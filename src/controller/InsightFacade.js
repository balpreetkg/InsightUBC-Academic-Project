"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const Helpers_1 = require("./Helpers");
class InsightFacade {
    constructor() {
        Util_1.default.trace("InsightFacadeImpl::init()");
    }
    addDataset(id, content, kind) {
        if (!id || !content || !kind || id === "" || content === "") {
            return Promise.reject(new IInsightFacade_1.InsightError("Passing null/empty parameters"));
        }
        else {
            switch (kind) {
                case IInsightFacade_1.InsightDatasetKind.Rooms:
                    return Helpers_1.default.prototype.addRoomDataset(id, content);
                case IInsightFacade_1.InsightDatasetKind.Courses:
                    return Helpers_1.default.prototype.addCourseDataset(id, content);
                default:
                    return Promise.reject(new IInsightFacade_1.InsightError("Trying to add dataset of unknown kind"));
            }
        }
    }
    removeDataset(id) {
        if (!id || id === "") {
            return Promise.reject(new IInsightFacade_1.InsightError("Passing null id"));
        }
        else {
            return Helpers_1.default.prototype.removeDatasetHelper(id);
        }
    }
    performQuery(query) {
        if (!query || query === "") {
            return Promise.reject(new IInsightFacade_1.InsightError("Passing null query"));
        }
        else {
            return Helpers_1.default.prototype.performQueryHelper(query);
        }
    }
    listDatasets() {
        return Helpers_1.default.prototype.listAllDatasets();
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map