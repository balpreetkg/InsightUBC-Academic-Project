import {isObject, log} from "util";
import {ICourse} from "./Course";
import {JSZipObject} from "jszip";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import Query from "./Query";
import {IRoom} from "./Room";
import * as http from "http";

export default class Helpers {

    public static removeData(): void {
        let fs = require("fs");
        const path = "./data/courses";
        const path0 = "./data";
        if (fs.existsSync(path)) {
            let files = fs.readdirSync(path);
            for (let filename of files) {
                fs.unlinkSync(path + filename);
            }
            fs.rmdirSync(path);
            fs.rmdirSync(path0);
        }
    }

    public removeDatasetHelper(id: string): Promise<string> { // todo add checking for room
        return new Promise(function (fulfill, reject) {
            if (Helpers.prototype.listAddedDatasetIds().includes(id)) {
                let fs = require("fs");
                let file;
                let type = "";
                if (fs.existsSync("./data/courses/" + id + ".json")) {
                    file = "./data/courses/" + id + ".json";
                    type = "c";
                } else if (fs.existsSync("./data/rooms/" + id + ".json")) {
                    file =  "./data/rooms/" + id + ".json";
                    type = "r";
                }
                fs.unlink(file, (err: any) => {
                    if (err) {
                        reject(new NotFoundError(err));
                    } else if (!Helpers.prototype.listAddedDatasetIds().length) {
                        if (fs.existsSync("./data/courses")) {
                            fs.rmdirSync("./data/courses");
                        }
                        if (fs.existsSync("./data/rooms")) {
                            fs.rmdirSync("./data/rooms");
                        }
                    }
                    fulfill(id);
                });
            } else {
                reject(new NotFoundError());
            }
        });
    }

    public listAddedDatasetIds(): string[] {
        let toret: string[] = [];
        let fs = require("fs");
        const path = "./data/courses";
        const path1 = "./data/rooms";
        if (fs.existsSync(path)) {
            let files = fs.readdirSync(path);
            for (let filename of files) {
                if (filename.endsWith(".json")) {
                    toret.push(filename.substring(0, filename.indexOf(".json")));
                }
            }
        }
        if (fs.existsSync(path1)) {
            let files = fs.readdirSync(path1);
            for (let filename of files) {
                if (filename.endsWith(".json")) {
                    toret.push(filename.substring(0, filename.indexOf(".json")));
                }
            }
        }
        return toret;
    }

    public addCourses(relativePath: string, file: JSZipObject): Promise<string> {
        if (file.dir) {
            return Promise.reject(new InsightError("subFolder found in the courses folder"));
        }
        let courseString: string = "";
        return file.async("text")
            .then(function success(con) {
                let j: any;
                try {
                    j = JSON.parse(con);
                } catch (e) {
                    throw new InsightError("Error parsing json " + e);
                }
                if (Object.keys(j.result).length) {
                    for (let i = 0; i < Object.keys(j.result).length; i++) {
                        let c = {} as ICourse;
                        c.dept = j.result[i].Subject;
                        c.id = j.result[i].Course;
                        c.avg = j.result[i].Avg;
                        c.instructor = j.result[i].Professor;
                        c.title = j.result[i].Title;
                        c.pass = j.result[i].Pass;
                        c.fail = j.result[i].Fail;
                        c.audit = j.result[i].Audit;
                        c.uuid = j.result[i].id.toString();
                        if (j.result[i].Section === "overall") {
                            c.year = 1900;
                        } else {
                            c.year = Number(j.result[i].Year);
                        }
                        let data = JSON.stringify(c);
                        if (i === Object.keys(j.result).length - 1) {
                            courseString = courseString.concat(data);
                        } else {
                            courseString = courseString.concat(data + ",");
                        }
                    }
                    return courseString;
                }
                return courseString;
            }, function error(e) {
                // handle the error on async read
                return Promise.reject("Something went wrong with data parsing " + e);
            }).then((value) => {
                return Promise.resolve(value);
            });

    }

    public async getLatLon(address: string): Promise<number[]> {
        return new Promise<number[]>(function (fulfill) {
            http.get(address, (res: any) => {
                const { statusCode } = res;
                const contentType = res.headers["content-type"];

                let error;
                if (statusCode !== 200) {
                    error = new Error("Request Failed.\n" +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content-type.\n" +
                        `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    log(error.message);
                    res.resume();
                    fulfill([0, 0]);
                }
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk: any) => { rawData += chunk; });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        fulfill([parsedData.lat, parsedData.lon]);
                    } catch (e) {
                        log(e.message);
                    }
                });
            });
        });
    }

    public processIndexFile(id: string, index: string, zip: JSZip): Array<Promise<string>> {
        let rooms: Array<Promise<string>> = [];
        let buildings: string[] = [];
        const p5 = require("parse5");
        let s = index.indexOf("<tbody>");
        let e = index.indexOf("/tbody>") + 7;
        let tb = index.substring(s, e);
        let full = p5.parseFragment(tb);
        let rows = full.childNodes[0].childNodes;
        rows.forEach(function (tr: any) {
            if (tr.tagName === "tr") {
                let lin: string = "";
                if (tr.childNodes[1].childNodes[1].attrs[0].name === "src") {
                    lin = tr.childNodes[5].childNodes[1].attrs[0].value;
                } else {
                    lin = tr.childNodes[1].childNodes[1].attrs[0].value;
                }
                if (!lin.includes("http://")) {
                    buildings.push(lin);
                }
            }
        });
        if (buildings.length) {
            buildings.forEach(function (b: string) {
                let spl = b.split("/");
                let sname = spl[spl.length - 1];
                let ind = zip.file(b.substr(2));
                if (ind !== null) {
                    rooms.push(Helpers.prototype.addRooms(ind, sname));
                }
            });
            return rooms;
        } else {
            throw new InsightError("No buildings found in the dataset");
        }
    }

    public async addRoomDataset(id: string, content: string): Promise<string[]> {
        return new Promise<string[]>(function (fulfill, reject) {
            if (!Helpers.prototype.listAddedDatasetIds().includes(id)) {
                let newZip = new JSZip();
                newZip.loadAsync(content, {base64: true, createFolders: true})
                    .then(async function (zip) {
                        let lrooms: Array<Promise<string>> = [];
                        if (!zip.folder(/rooms/).length) {
                            reject(new InsightError("No rooms folder"));
                        } else {
                            let ind = zip.file("index.htm");
                            await ind.async("text")
                                .then(async function success(con) {
                                    lrooms = Helpers.prototype.processIndexFile(id, con, zip);
                                    if (lrooms.length) {
                                        return Promise.all(lrooms);
                                    } else {
                                        reject(new InsightError("No courses found in the dataset"));
                                    }
                            }).then(function (promiseArray) {
                                let fs = require("fs");
                                const dir1 = "./data";
                                const dir2 = "./data/rooms";
                                if (!fs.existsSync(dir1)) {
                                    fs.mkdirSync(dir1);
                                }
                                if (!fs.existsSync(dir2)) {
                                    fs.mkdirSync(dir2);
                                }
                                return Helpers.prototype.writeDatasetToFile(promiseArray, id, "rooms");
                            }).catch(function (err) {
                                    reject(new InsightError(err));
                                }).then(function (success) {
                                    if (success) {
                                        fulfill(Helpers.prototype.listAddedDatasetIds());
                                    }
                                }).catch( function (err) {
                                    reject(new InsightError(err));
                                });
                        }
                    });
            } else {
                reject(new InsightError("Dataset already added"));
            }
        });
    }

    public addCourseDataset(id: string, content: string): Promise<string[]> {
        return new Promise(function (fulfill, reject) {
            if (!Helpers.prototype.listAddedDatasetIds().includes(id)) {
                let newZip = new JSZip();
                newZip.loadAsync(content, {base64: true, createFolders: true})
                    .then(function (zip) {
                        let lcourses: Array<Promise<string>> = [];
                        if (!zip.folder(/courses/).length) {
                            reject(new InsightError("No courses folder"));
                        } else if (!Object.values(zip.folder("courses").files).length) {
                            reject(new InsightError("Empty dataset"));
                        } else {
                            zip.folder("courses").forEach(function (relativePath, file) {
                                lcourses.push(Helpers.prototype.addCourses(relativePath, file));
                            });
                            if (lcourses.length) {
                                return Promise.all(lcourses);
                            } else {
                                reject(new InsightError("No courses found in the dataset"));
                            }
                        }
                    }).then(function (promiseArray) {
                    let fs = require("fs");
                    const dir1 = "./data";
                    const dir2 = "./data/courses";
                    if (!fs.existsSync(dir1)) {
                        fs.mkdirSync(dir1);
                    }
                    if (!fs.existsSync(dir2)) {
                        fs.mkdirSync(dir2);
                    }
                    return Helpers.prototype.writeDatasetToFile(promiseArray, id, "courses");
                }).catch(function (err) {
                    reject(new InsightError(err));
                }).then(function (success) {
                    if (success) {
                        fulfill(Helpers.prototype.listAddedDatasetIds());
                    }
                }).catch( function (err) {
                    reject(new InsightError(err));
                });
            } else {
                reject(new InsightError("Dataset already added"));
            }
        });
    }

    public performQueryHelper(query: any): Promise<any[]> {
        return new Promise((fulfill, reject) => {
            if (isObject(query)) {
                const q: Query = new Query();
                let array: any[] = [];
                try {
                    array = q.arrayCreator(query);
                } catch (e) {
                    reject(new InsightError("Error" + e));
                }
                try {
                    fulfill(q.computeQuery(query, array));
                } catch (e) {
                    reject(new InsightError("Error" + e));
                }
            } else {
                reject(new InsightError("Error: query not an object"));
            }
        });
    }

    public listAllDatasets(): Promise<InsightDataset[]> {
        return new Promise(function (fulfill) {
            let set: InsightDataset[] = [];
            let fs = require("fs");
            const path1 = "./data/rooms";
            const path = "./data/courses";
            if (fs.existsSync(path)) {
                let files = fs.readdirSync(path);
                for (let filename of files) {
                    if (filename.endsWith(".json")) {
                        let id = filename.slice(0, -5);
                        log(id);
                        let file = fs.readFileSync(path + "/" + filename, "utf8");
                        let j = JSON.parse(file);
                        let len = Object.values(j).length;
                        set.push({id, numRows: len, kind: InsightDatasetKind.Courses});
                    }
                }
            }
            if (fs.existsSync(path1)) {
                let files = fs.readdirSync(path1);
                for (let filename of files) {
                    if (filename.endsWith(".json")) {
                        let id = filename.slice(0, -5);
                        log(id);
                        let file = fs.readFileSync(path1 + "/" + filename, "utf8");
                        let j = JSON.parse(file);
                        let len = Object.values(j).length;
                        set.push({id, numRows: len, kind: InsightDatasetKind.Rooms});
                    }
                }
            }
            fulfill(set);
        });
    }

    public writeDatasetToFile(lcourses: string[], id: string, type: string): Promise<boolean> {
        let fs = require("fs");
        let path = "";
        if (type === "courses") {
            path = "./data/courses/" + id + ".json";
        } else if (type === "rooms") {
            path = "./data/rooms/" + id + ".json";
        } else {
            Promise.reject("unrecognized dataset type");
        }
        let data: string = "[";
        lcourses.forEach(function (value, index, array) {
            if (index === array.length - 1) {//  if it's the last one
                if (value.length) {
                    data = data.concat(value + "]");
                } else {
                    if (data.endsWith(",")) {
                        data = data.slice(0, -1);
                    }
                    data = data + "]";
                }
            } else {
                if (value.length) {
                    data = data.concat(value + ",");
                }
            }
        });
        try {
            fs.writeFileSync(path, data, "utf8");
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve(true);
    }

    public addRooms(ind: any, sname: string): Promise<string> {
        let roomString: string = "";
        return ind.async("text").then(async function success(con: any) {
            if (con.includes("<tbody>")) {
                let s = con.indexOf("<div id=\"building-info\">");
                let e = con.indexOf("<div id=\"building-image\">");
                let p5 = require("parse5");
                let binfo = p5.parseFragment(con.substring(s, e)).childNodes[0].childNodes;
                let fname = binfo[1].childNodes[0].childNodes[0].value;
                let address = binfo[3].childNodes[0].childNodes[0].value;
                let link = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_c7w9a_d1j0b/";
                let requestString = link + encodeURI(address);
                let latLon: number[] = await Helpers.prototype.getLatLon(requestString);
                if (sname === "ESB") {
                    log(address);
                    log(latLon.toString());
                }
                let lat = latLon[0];
                let lon = latLon[1];
                s = con.indexOf("<tbody>");
                e = con.indexOf("/tbody>") + 7;
                let tb = con.substring(s, e);
                let full = p5.parseFragment(tb);
                let rows = full.childNodes[0].childNodes;
                for (let r of rows) {
                    if (r.tagName === "tr") {
                        let room = {} as IRoom;
                        room.number = r.childNodes[1].childNodes[1].childNodes[0].value;
                        room.seats = parseInt(r.childNodes[3].childNodes[0].value, 10);
                        room.furniture = r.childNodes[5].childNodes[0].value.trim();
                        room.type = r.childNodes[7].childNodes[0].value.trim();
                        room.name = sname + "_" + room.number.toString();
                        room.shortname = sname;
                        room.fullname = fname;
                        room.address = address;
                        room.href = r.childNodes[9].childNodes[1].attrs[0].value;
                        room.lat = lat;
                        room.lon = lon;
                        let data = JSON.stringify(room);
                        roomString = roomString.concat(data + ",");
                    }
                }
                return roomString.slice(0, -1);
            }
            return roomString;
        }, function error(e: any) {
            // handle the error on async read
            return Promise.reject("Something went wrong with data parsing " + e);
        }).then((value: any) => {
            return Promise.resolve(value);
        });
    }
}
