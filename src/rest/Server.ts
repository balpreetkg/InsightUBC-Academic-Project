/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {expect} from "chai";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import {parse} from "ts-node";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    public insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
        try {
            this.insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(this.insightFacade).to.be.instanceOf(InsightFacade);
        }
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.del("/dataset/:id", async function (req: restify.Request,
                                                              res: restify.Response,
                                                              next: restify.Next) {
                    Log.info("Received a delete request for id: " + req.params.id);
                    that.insightFacade.removeDataset(req.params.id)
                        .then( function (v) {
                        res.json(200, {result: v});
                    }).catch( function (err) {
                            Log.info(err.toString());
                            if (err instanceof NotFoundError) {
                                res.json(404, {error: "Dataset Not found"});
                            } else if (err instanceof InsightError) {
                                res.json(400, {error: "Oops! Something went wrong"});
                            }
                        }
                    );
                    return next();
                });
                // NOTE: your endpoints should go here
                that.rest.put("/dataset/:id/:kind", async function (req: restify.Request,
                                                                    res: restify.Response,
                                                                    next: restify.Next) {
                    let buf: Buffer = req.params.body;
                    const zip = Buffer.from(buf).toString("base64");
                    let kind: InsightDatasetKind;
                    if (req.params.kind === "courses") {
                        kind = InsightDatasetKind.Courses;
                    } else if (req.params.kind === "rooms") {
                        kind = InsightDatasetKind.Rooms;
                    }
                    let id = req.params.id;
                    Log.info("received an add dataset request for : " + req.params.kind + " with id: " + id);
                    that.insightFacade.addDataset(req.params.id, zip, kind).then( function (v) {
                            res.json(200, {result: v});
                        }).catch( function (err) {
                            res.json(400, {error: "Oops! Something went wrong"});
                        }
                    );
                    return next();
                });
                that.rest.post("/query", async function (req: restify.Request,
                                                         res: restify.Response,
                                                         next: restify.Next) {
                    Log.info(JSON.stringify(req.body));
                    that.insightFacade.performQuery(req.body).then( function (v) {
                        res.json(200, {result: v});
                    }).catch( function (err) {
                            res.json(400, {error: "Oops! Something went wrong : " + err});
                        }
                    );
                    return next();
                });
                that.rest.get("/datasets", async function (req: restify.Request,
                                                           res: restify.Response,
                                                           next: restify.Next) {
                    that.insightFacade.listDatasets().then( function (v) {
                        res.json(200, {result: v});
                    }).catch( function (err) {
                            res.json(400, {error: "Oops! Something went wrong"});
                        }
                    );
                    return next();
                });
                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
