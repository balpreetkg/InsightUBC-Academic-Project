"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const IInsightFacade_1 = require("./IInsightFacade");
const JSZip = require("jszip");
const Query_1 = require("./Query");
const http = require("http");
class Helpers {
    static removeData() {
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
    removeDatasetHelper(id) {
        return new Promise(function (fulfill, reject) {
            if (Helpers.prototype.listAddedDatasetIds().includes(id)) {
                let fs = require("fs");
                let file;
                let type = "";
                if (fs.existsSync("./data/courses/" + id + ".json")) {
                    file = "./data/courses/" + id + ".json";
                    type = "c";
                }
                else if (fs.existsSync("./data/rooms/" + id + ".json")) {
                    file = "./data/rooms/" + id + ".json";
                    type = "r";
                }
                fs.unlink(file, (err) => {
                    if (err) {
                        reject(new IInsightFacade_1.NotFoundError(err));
                    }
                    else if (!Helpers.prototype.listAddedDatasetIds().length) {
                        if (fs.existsSync("./data/courses")) {
                            fs.rmdirSync("./data/courses");
                        }
                        if (fs.existsSync("./data/rooms")) {
                            fs.rmdirSync("./data/rooms");
                        }
                    }
                    fulfill(id);
                });
            }
            else {
                reject(new IInsightFacade_1.NotFoundError());
            }
        });
    }
    listAddedDatasetIds() {
        let toret = [];
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
    addCourses(relativePath, file) {
        if (file.dir) {
            return Promise.reject(new IInsightFacade_1.InsightError("subFolder found in the courses folder"));
        }
        let courseString = "";
        return file.async("text")
            .then(function success(con) {
            let j;
            try {
                j = JSON.parse(con);
            }
            catch (e) {
                throw new IInsightFacade_1.InsightError("Error parsing json " + e);
            }
            if (Object.keys(j.result).length) {
                for (let i = 0; i < Object.keys(j.result).length; i++) {
                    let c = {};
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
                    }
                    else {
                        c.year = Number(j.result[i].Year);
                    }
                    let data = JSON.stringify(c);
                    if (i === Object.keys(j.result).length - 1) {
                        courseString = courseString.concat(data);
                    }
                    else {
                        courseString = courseString.concat(data + ",");
                    }
                }
                return courseString;
            }
            return courseString;
        }, function error(e) {
            return Promise.reject("Something went wrong with data parsing " + e);
        }).then((value) => {
            return Promise.resolve(value);
        });
    }
    getLatLon(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (fulfill) {
                http.get(address, (res) => {
                    const { statusCode } = res;
                    const contentType = res.headers["content-type"];
                    let error;
                    if (statusCode !== 200) {
                        error = new Error("Request Failed.\n" +
                            `Status Code: ${statusCode}`);
                    }
                    else if (!/^application\/json/.test(contentType)) {
                        error = new Error("Invalid content-type.\n" +
                            `Expected application/json but received ${contentType}`);
                    }
                    if (error) {
                        util_1.log(error.message);
                        res.resume();
                        fulfill([0, 0]);
                    }
                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk) => { rawData += chunk; });
                    res.on("end", () => {
                        try {
                            const parsedData = JSON.parse(rawData);
                            fulfill([parsedData.lat, parsedData.lon]);
                        }
                        catch (e) {
                            util_1.log(e.message);
                        }
                    });
                });
            });
        });
    }
    processIndexFile(id, index, zip) {
        let rooms = [];
        let buildings = [];
        const p5 = require("parse5");
        let s = index.indexOf("<tbody>");
        let e = index.indexOf("/tbody>") + 7;
        let tb = index.substring(s, e);
        let full = p5.parseFragment(tb);
        let rows = full.childNodes[0].childNodes;
        rows.forEach(function (tr) {
            if (tr.tagName === "tr") {
                let lin = "";
                if (tr.childNodes[1].childNodes[1].attrs[0].name === "src") {
                    lin = tr.childNodes[5].childNodes[1].attrs[0].value;
                }
                else {
                    lin = tr.childNodes[1].childNodes[1].attrs[0].value;
                }
                if (!lin.includes("http://")) {
                    buildings.push(lin);
                }
            }
        });
        if (buildings.length) {
            buildings.forEach(function (b) {
                let spl = b.split("/");
                let sname = spl[spl.length - 1];
                let ind = zip.file(b.substr(2));
                if (ind !== null) {
                    rooms.push(Helpers.prototype.addRooms(ind, sname));
                }
            });
            return rooms;
        }
        else {
            throw new IInsightFacade_1.InsightError("No buildings found in the dataset");
        }
    }
    addRoomDataset(id, content) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (fulfill, reject) {
                if (!Helpers.prototype.listAddedDatasetIds().includes(id)) {
                    let newZip = new JSZip();
                    newZip.loadAsync(content, { base64: true, createFolders: true })
                        .then(function (zip) {
                        return __awaiter(this, void 0, void 0, function* () {
                            let lrooms = [];
                            if (!zip.folder(/rooms/).length) {
                                reject(new IInsightFacade_1.InsightError("No rooms folder"));
                            }
                            else {
                                let ind = zip.file("index.htm");
                                yield ind.async("text")
                                    .then(function success(con) {
                                    return __awaiter(this, void 0, void 0, function* () {
                                        lrooms = Helpers.prototype.processIndexFile(id, con, zip);
                                        if (lrooms.length) {
                                            return Promise.all(lrooms);
                                        }
                                        else {
                                            reject(new IInsightFacade_1.InsightError("No courses found in the dataset"));
                                        }
                                    });
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
                                    reject(new IInsightFacade_1.InsightError(err));
                                }).then(function (success) {
                                    if (success) {
                                        fulfill(Helpers.prototype.listAddedDatasetIds());
                                    }
                                }).catch(function (err) {
                                    reject(new IInsightFacade_1.InsightError(err));
                                });
                            }
                        });
                    });
                }
                else {
                    reject(new IInsightFacade_1.InsightError("Dataset already added"));
                }
            });
        });
    }
    addCourseDataset(id, content) {
        return new Promise(function (fulfill, reject) {
            if (!Helpers.prototype.listAddedDatasetIds().includes(id)) {
                let newZip = new JSZip();
                newZip.loadAsync(content, { base64: true, createFolders: true })
                    .then(function (zip) {
                    let lcourses = [];
                    if (!zip.folder(/courses/).length) {
                        reject(new IInsightFacade_1.InsightError("No courses folder"));
                    }
                    else if (!Object.values(zip.folder("courses").files).length) {
                        reject(new IInsightFacade_1.InsightError("Empty dataset"));
                    }
                    else {
                        zip.folder("courses").forEach(function (relativePath, file) {
                            lcourses.push(Helpers.prototype.addCourses(relativePath, file));
                        });
                        if (lcourses.length) {
                            return Promise.all(lcourses);
                        }
                        else {
                            reject(new IInsightFacade_1.InsightError("No courses found in the dataset"));
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
                    reject(new IInsightFacade_1.InsightError(err));
                }).then(function (success) {
                    if (success) {
                        fulfill(Helpers.prototype.listAddedDatasetIds());
                    }
                }).catch(function (err) {
                    reject(new IInsightFacade_1.InsightError(err));
                });
            }
            else {
                reject(new IInsightFacade_1.InsightError("Dataset already added"));
            }
        });
    }
    performQueryHelper(query) {
        return new Promise((fulfill, reject) => {
            if (util_1.isObject(query)) {
                const q = new Query_1.default();
                let array = [];
                try {
                    array = q.arrayCreator(query);
                }
                catch (e) {
                    reject(new IInsightFacade_1.InsightError("Error" + e));
                }
                try {
                    fulfill(q.computeQuery(query, array));
                }
                catch (e) {
                    reject(new IInsightFacade_1.InsightError("Error" + e));
                }
            }
            else {
                reject(new IInsightFacade_1.InsightError("Error: query not an object"));
            }
        });
    }
    listAllDatasets() {
        return new Promise(function (fulfill) {
            let set = [];
            let fs = require("fs");
            const path1 = "./data/rooms";
            const path = "./data/courses";
            if (fs.existsSync(path)) {
                let files = fs.readdirSync(path);
                for (let filename of files) {
                    if (filename.endsWith(".json")) {
                        let id = filename.slice(0, -5);
                        util_1.log(id);
                        let file = fs.readFileSync(path + "/" + filename, "utf8");
                        let j = JSON.parse(file);
                        let len = Object.values(j).length;
                        set.push({ id, numRows: len, kind: IInsightFacade_1.InsightDatasetKind.Courses });
                    }
                }
            }
            if (fs.existsSync(path1)) {
                let files = fs.readdirSync(path1);
                for (let filename of files) {
                    if (filename.endsWith(".json")) {
                        let id = filename.slice(0, -5);
                        util_1.log(id);
                        let file = fs.readFileSync(path1 + "/" + filename, "utf8");
                        let j = JSON.parse(file);
                        let len = Object.values(j).length;
                        set.push({ id, numRows: len, kind: IInsightFacade_1.InsightDatasetKind.Rooms });
                    }
                }
            }
            fulfill(set);
        });
    }
    writeDatasetToFile(lcourses, id, type) {
        let fs = require("fs");
        let path = "";
        if (type === "courses") {
            path = "./data/courses/" + id + ".json";
        }
        else if (type === "rooms") {
            path = "./data/rooms/" + id + ".json";
        }
        else {
            Promise.reject("unrecognized dataset type");
        }
        let data = "[";
        lcourses.forEach(function (value, index, array) {
            if (index === array.length - 1) {
                if (value.length) {
                    data = data.concat(value + "]");
                }
                else {
                    if (data.endsWith(",")) {
                        data = data.slice(0, -1);
                    }
                    data = data + "]";
                }
            }
            else {
                if (value.length) {
                    data = data.concat(value + ",");
                }
            }
        });
        try {
            fs.writeFileSync(path, data, "utf8");
        }
        catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve(true);
    }
    addRooms(ind, sname) {
        let roomString = "";
        return ind.async("text").then(function success(con) {
            return __awaiter(this, void 0, void 0, function* () {
                if (con.includes("<tbody>")) {
                    let s = con.indexOf("<div id=\"building-info\">");
                    let e = con.indexOf("<div id=\"building-image\">");
                    let p5 = require("parse5");
                    let binfo = p5.parseFragment(con.substring(s, e)).childNodes[0].childNodes;
                    let fname = binfo[1].childNodes[0].childNodes[0].value;
                    let address = binfo[3].childNodes[0].childNodes[0].value;
                    let link = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_c7w9a_d1j0b/";
                    let requestString = link + encodeURI(address);
                    let latLon = yield Helpers.prototype.getLatLon(requestString);
                    if (sname === "ESB") {
                        util_1.log(address);
                        util_1.log(latLon.toString());
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
                            let room = {};
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
            });
        }, function error(e) {
            return Promise.reject("Something went wrong with data parsing " + e);
        }).then((value) => {
            return Promise.resolve(value);
        });
    }
}
exports.default = Helpers;
//# sourceMappingURL=Helpers.js.map