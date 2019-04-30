import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import Helpers from "./Helpers";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (!id || !content || !kind || id === "" || content === "") {
            return Promise.reject(new InsightError("Passing null/empty parameters"));
        } else {
            switch (kind) {
                case InsightDatasetKind.Rooms:
                    return Helpers.prototype.addRoomDataset(id, content);
                case InsightDatasetKind.Courses:
                    return Helpers.prototype.addCourseDataset(id, content);
                default:
                    return Promise.reject(new InsightError("Trying to add dataset of unknown kind"));
            }
        }
    }

    public removeDataset(id: string): Promise<string> {
        if (!id || id === "") {
            return Promise.reject(new InsightError("Passing null id"));
        } else {
            return Helpers.prototype.removeDatasetHelper(id);
        }
    }

    public performQuery(query: any): Promise <any[]> {
        if (!query || query === "") {
            return Promise.reject(new InsightError("Passing null query"));
        } else {
            return Helpers.prototype.performQueryHelper(query);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Helpers.prototype.listAllDatasets();
    }
}
