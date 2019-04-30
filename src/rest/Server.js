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
const fs = require("fs");
const restify = require("restify");
const Util_1 = require("../Util");
const InsightFacade_1 = require("../controller/InsightFacade");
const chai_1 = require("chai");
const IInsightFacade_1 = require("../controller/IInsightFacade");
class Server {
    constructor(port) {
        Util_1.default.info("Server::<init>( " + port + " )");
        this.port = port;
        try {
            this.insightFacade = new InsightFacade_1.default();
        }
        catch (err) {
            Util_1.default.error(err);
        }
        finally {
            chai_1.expect(this.insightFacade).to.be.instanceOf(InsightFacade_1.default);
        }
    }
    stop() {
        Util_1.default.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }
    start() {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Util_1.default.info("Server::start() - start");
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({ mapFiles: true, mapParams: true }));
                that.rest.use(function crossOrigin(req, res, next) {
                    res.header("Access-Control-Allow-Origin", "*");
                    res.header("Access-Control-Allow-Headers", "X-Requested-With");
                    return next();
                });
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.del("/dataset/:id", function (req, res, next) {
                    return __awaiter(this, void 0, void 0, function* () {
                        Util_1.default.info("Received a delete request for id: " + req.params.id);
                        that.insightFacade.removeDataset(req.params.id)
                            .then(function (v) {
                            res.json(200, { result: v });
                        }).catch(function (err) {
                            Util_1.default.info(err.toString());
                            if (err instanceof IInsightFacade_1.NotFoundError) {
                                res.json(404, { error: "Dataset Not found" });
                            }
                            else if (err instanceof IInsightFacade_1.InsightError) {
                                res.json(400, { error: "Oops! Something went wrong" });
                            }
                        });
                        return next();
                    });
                });
                that.rest.put("/dataset/:id/:kind", function (req, res, next) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let buf = req.params.body;
                        const zip = Buffer.from(buf).toString("base64");
                        let kind;
                        if (req.params.kind === "courses") {
                            kind = IInsightFacade_1.InsightDatasetKind.Courses;
                        }
                        else if (req.params.kind === "rooms") {
                            kind = IInsightFacade_1.InsightDatasetKind.Rooms;
                        }
                        let id = req.params.id;
                        Util_1.default.info("received an add dataset request for : " + req.params.kind + " with id: " + id);
                        that.insightFacade.addDataset(req.params.id, zip, kind).then(function (v) {
                            res.json(200, { result: v });
                        }).catch(function (err) {
                            res.json(400, { error: "Oops! Something went wrong" });
                        });
                        return next();
                    });
                });
                that.rest.post("/query", function (req, res, next) {
                    return __awaiter(this, void 0, void 0, function* () {
                        Util_1.default.info(JSON.stringify(req.body));
                        that.insightFacade.performQuery(req.body).then(function (v) {
                            res.json(200, { result: v });
                        }).catch(function (err) {
                            res.json(400, { error: "Oops! Something went wrong : " + err });
                        });
                        return next();
                    });
                });
                that.rest.get("/datasets", function (req, res, next) {
                    return __awaiter(this, void 0, void 0, function* () {
                        that.insightFacade.listDatasets().then(function (v) {
                            res.json(200, { result: v });
                        }).catch(function (err) {
                            res.json(400, { error: "Oops! Something went wrong" });
                        });
                        return next();
                    });
                });
                that.rest.get("/.*", Server.getStatic);
                that.rest.listen(that.port, function () {
                    Util_1.default.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });
                that.rest.on("error", function (err) {
                    Util_1.default.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
            }
            catch (err) {
                Util_1.default.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }
    static echo(req, res, next) {
        Util_1.default.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Util_1.default.info("Server::echo(..) - responding " + 200);
            res.json(200, { result: response });
        }
        catch (err) {
            Util_1.default.error("Server::echo(..) - responding 400");
            res.json(400, { error: err });
        }
        return next();
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
    static getStatic(req, res, next) {
        const publicDir = "frontend/public/";
        Util_1.default.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err, file) {
            if (err) {
                res.send(500);
                Util_1.default.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map