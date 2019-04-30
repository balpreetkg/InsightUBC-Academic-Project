export interface IQ {
    WHERE: [{}, IWhere];
    OPTIONS: IOptions;
    TRANSFORMATIONS: ITrans;
}

export interface IWhere {
    AND: object[];
    OR: object[];
    NOT: object;
    IS: object;
    GT: object;
    LT: object;
    EQ: object;
}

export interface IOptions {
    COLUMNS: string[];
    ORDER: any;
}

export interface ITrans {
    GROUP: string[];
    APPLY: object[];
}

export interface IQuery {
    /**
     * creates the array of objects which we will filter
     */
    arrayCreator(query: IQ): object[];
    /**
     * extracts the ID and saves it to a variable to be accessed later
     * returns true if ID is found
     * returns false if ID is not found
     */
    idExtractor(query: IQ): boolean;
    /**
     * set valid keys dependent on the kind of data set
     */
    setValidKeys(): any;
    /**
     * computes the Query from beginning to end
     * returns the list of objects corresponding to the query
     * will throw an error if any error occurs
     */
    computeQuery(query: IQ, result: object[]): object[];
    /**
     * computes Where block
     */
    computeWHERE(whereBlock: any, result: object[]): object[];
    /**
     * computes Options block
     */
    computeOPTIONS(options: any, result: object[]): object[];
    /**
     * computes Transformations block
     */
    computeTRANSFORMATIONS(applyBlock: any, group: string[], result: any): object[];
    /**
     * computes all the different Apply Rules
     */
    computeAPPLY(applyBlock: any): object[];
    /**
     * computes the specific apply tokens
     */
    applyRule(applyObject: any, index: string): number;
    /**
     * computes columns block
     */
    computeCOLUMNS(columns: string[], result: object[]): object[];
    /**
     * computes sort order
     */
    computeORDER(orderKey: any, result: object[]): object[];
    /**
     * computes AND
     */
    computeAND(andBlock: any, result: any): any;
    /**
     * computes OR
     */
    computeOR(orBlock: any, result: any): any;
    /**
     * filters the OR results
     */
    unique(array: any): object[];
    /**
     * computes NOT
     */
    computeNOT(notBlock: any, result: any): any;
    /**
     * computes LT
     */
    computeLT(lessBlock: any, result: object[]): object[];
    /**
     * computes GT
     */
    computeGT(greaterBlock: any, result: object[]): object[];
    /**
     * computes EQ
     */
    computeEQ(equalBlock: any, result: object[]): object[];
    /**
     * computes IS
     */
    computeIS(isBlock: any, result: object[]): object[];
}
