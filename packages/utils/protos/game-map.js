/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const GameMap = $root.GameMap = (() => {

    /**
     * Properties of a GameMap.
     * @exports IGameMap
     * @interface IGameMap
     * @property {string|null} [id] GameMap id
     * @property {string|null} [jsonData] GameMap jsonData
     * @property {Array.<IModelItem>|null} [modelFiles] GameMap modelFiles
     * @property {Array.<IImageItem>|null} [imageFiles] GameMap imageFiles
     */

    /**
     * Constructs a new GameMap.
     * @exports GameMap
     * @classdesc Represents a GameMap.
     * @implements IGameMap
     * @constructor
     * @param {IGameMap=} [properties] Properties to set
     */
    function GameMap(properties) {
        this.modelFiles = [];
        this.imageFiles = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * GameMap id.
     * @member {string} id
     * @memberof GameMap
     * @instance
     */
    GameMap.prototype.id = "";

    /**
     * GameMap jsonData.
     * @member {string} jsonData
     * @memberof GameMap
     * @instance
     */
    GameMap.prototype.jsonData = "";

    /**
     * GameMap modelFiles.
     * @member {Array.<IModelItem>} modelFiles
     * @memberof GameMap
     * @instance
     */
    GameMap.prototype.modelFiles = $util.emptyArray;

    /**
     * GameMap imageFiles.
     * @member {Array.<IImageItem>} imageFiles
     * @memberof GameMap
     * @instance
     */
    GameMap.prototype.imageFiles = $util.emptyArray;

    /**
     * Creates a new GameMap instance using the specified properties.
     * @function create
     * @memberof GameMap
     * @static
     * @param {IGameMap=} [properties] Properties to set
     * @returns {GameMap} GameMap instance
     */
    GameMap.create = function create(properties) {
        return new GameMap(properties);
    };

    /**
     * Encodes the specified GameMap message. Does not implicitly {@link GameMap.verify|verify} messages.
     * @function encode
     * @memberof GameMap
     * @static
     * @param {IGameMap} message GameMap message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GameMap.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && Object.hasOwnProperty.call(message, "id"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
        if (message.jsonData != null && Object.hasOwnProperty.call(message, "jsonData"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.jsonData);
        if (message.modelFiles != null && message.modelFiles.length)
            for (let i = 0; i < message.modelFiles.length; ++i)
                $root.ModelItem.encode(message.modelFiles[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        if (message.imageFiles != null && message.imageFiles.length)
            for (let i = 0; i < message.imageFiles.length; ++i)
                $root.ImageItem.encode(message.imageFiles[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified GameMap message, length delimited. Does not implicitly {@link GameMap.verify|verify} messages.
     * @function encodeDelimited
     * @memberof GameMap
     * @static
     * @param {IGameMap} message GameMap message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GameMap.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a GameMap message from the specified reader or buffer.
     * @function decode
     * @memberof GameMap
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {GameMap} GameMap
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GameMap.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.GameMap();
        while (reader.pos < end) {
            let tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.id = reader.string();
                    break;
                }
            case 2: {
                    message.jsonData = reader.string();
                    break;
                }
            case 3: {
                    if (!(message.modelFiles && message.modelFiles.length))
                        message.modelFiles = [];
                    message.modelFiles.push($root.ModelItem.decode(reader, reader.uint32()));
                    break;
                }
            case 4: {
                    if (!(message.imageFiles && message.imageFiles.length))
                        message.imageFiles = [];
                    message.imageFiles.push($root.ImageItem.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a GameMap message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof GameMap
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {GameMap} GameMap
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GameMap.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a GameMap message.
     * @function verify
     * @memberof GameMap
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    GameMap.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.id != null && message.hasOwnProperty("id"))
            if (!$util.isString(message.id))
                return "id: string expected";
        if (message.jsonData != null && message.hasOwnProperty("jsonData"))
            if (!$util.isString(message.jsonData))
                return "jsonData: string expected";
        if (message.modelFiles != null && message.hasOwnProperty("modelFiles")) {
            if (!Array.isArray(message.modelFiles))
                return "modelFiles: array expected";
            for (let i = 0; i < message.modelFiles.length; ++i) {
                let error = $root.ModelItem.verify(message.modelFiles[i]);
                if (error)
                    return "modelFiles." + error;
            }
        }
        if (message.imageFiles != null && message.hasOwnProperty("imageFiles")) {
            if (!Array.isArray(message.imageFiles))
                return "imageFiles: array expected";
            for (let i = 0; i < message.imageFiles.length; ++i) {
                let error = $root.ImageItem.verify(message.imageFiles[i]);
                if (error)
                    return "imageFiles." + error;
            }
        }
        return null;
    };

    /**
     * Creates a GameMap message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof GameMap
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {GameMap} GameMap
     */
    GameMap.fromObject = function fromObject(object) {
        if (object instanceof $root.GameMap)
            return object;
        let message = new $root.GameMap();
        if (object.id != null)
            message.id = String(object.id);
        if (object.jsonData != null)
            message.jsonData = String(object.jsonData);
        if (object.modelFiles) {
            if (!Array.isArray(object.modelFiles))
                throw TypeError(".GameMap.modelFiles: array expected");
            message.modelFiles = [];
            for (let i = 0; i < object.modelFiles.length; ++i) {
                if (typeof object.modelFiles[i] !== "object")
                    throw TypeError(".GameMap.modelFiles: object expected");
                message.modelFiles[i] = $root.ModelItem.fromObject(object.modelFiles[i]);
            }
        }
        if (object.imageFiles) {
            if (!Array.isArray(object.imageFiles))
                throw TypeError(".GameMap.imageFiles: array expected");
            message.imageFiles = [];
            for (let i = 0; i < object.imageFiles.length; ++i) {
                if (typeof object.imageFiles[i] !== "object")
                    throw TypeError(".GameMap.imageFiles: object expected");
                message.imageFiles[i] = $root.ImageItem.fromObject(object.imageFiles[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a GameMap message. Also converts values to other types if specified.
     * @function toObject
     * @memberof GameMap
     * @static
     * @param {GameMap} message GameMap
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    GameMap.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.modelFiles = [];
            object.imageFiles = [];
        }
        if (options.defaults) {
            object.id = "";
            object.jsonData = "";
        }
        if (message.id != null && message.hasOwnProperty("id"))
            object.id = message.id;
        if (message.jsonData != null && message.hasOwnProperty("jsonData"))
            object.jsonData = message.jsonData;
        if (message.modelFiles && message.modelFiles.length) {
            object.modelFiles = [];
            for (let j = 0; j < message.modelFiles.length; ++j)
                object.modelFiles[j] = $root.ModelItem.toObject(message.modelFiles[j], options);
        }
        if (message.imageFiles && message.imageFiles.length) {
            object.imageFiles = [];
            for (let j = 0; j < message.imageFiles.length; ++j)
                object.imageFiles[j] = $root.ImageItem.toObject(message.imageFiles[j], options);
        }
        return object;
    };

    /**
     * Converts this GameMap to JSON.
     * @function toJSON
     * @memberof GameMap
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    GameMap.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for GameMap
     * @function getTypeUrl
     * @memberof GameMap
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    GameMap.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/GameMap";
    };

    return GameMap;
})();

export const ModelItem = $root.ModelItem = (() => {

    /**
     * Properties of a ModelItem.
     * @exports IModelItem
     * @interface IModelItem
     * @property {string|null} [id] ModelItem id
     * @property {string|null} [name] ModelItem name
     * @property {string|null} [filetype] ModelItem filetype
     * @property {Uint8Array|null} [content] ModelItem content
     */

    /**
     * Constructs a new ModelItem.
     * @exports ModelItem
     * @classdesc Represents a ModelItem.
     * @implements IModelItem
     * @constructor
     * @param {IModelItem=} [properties] Properties to set
     */
    function ModelItem(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ModelItem id.
     * @member {string} id
     * @memberof ModelItem
     * @instance
     */
    ModelItem.prototype.id = "";

    /**
     * ModelItem name.
     * @member {string} name
     * @memberof ModelItem
     * @instance
     */
    ModelItem.prototype.name = "";

    /**
     * ModelItem filetype.
     * @member {string} filetype
     * @memberof ModelItem
     * @instance
     */
    ModelItem.prototype.filetype = "";

    /**
     * ModelItem content.
     * @member {Uint8Array} content
     * @memberof ModelItem
     * @instance
     */
    ModelItem.prototype.content = $util.newBuffer([]);

    /**
     * Creates a new ModelItem instance using the specified properties.
     * @function create
     * @memberof ModelItem
     * @static
     * @param {IModelItem=} [properties] Properties to set
     * @returns {ModelItem} ModelItem instance
     */
    ModelItem.create = function create(properties) {
        return new ModelItem(properties);
    };

    /**
     * Encodes the specified ModelItem message. Does not implicitly {@link ModelItem.verify|verify} messages.
     * @function encode
     * @memberof ModelItem
     * @static
     * @param {IModelItem} message ModelItem message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ModelItem.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && Object.hasOwnProperty.call(message, "id"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
        if (message.filetype != null && Object.hasOwnProperty.call(message, "filetype"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.filetype);
        if (message.content != null && Object.hasOwnProperty.call(message, "content"))
            writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.content);
        return writer;
    };

    /**
     * Encodes the specified ModelItem message, length delimited. Does not implicitly {@link ModelItem.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ModelItem
     * @static
     * @param {IModelItem} message ModelItem message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ModelItem.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ModelItem message from the specified reader or buffer.
     * @function decode
     * @memberof ModelItem
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ModelItem} ModelItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ModelItem.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ModelItem();
        while (reader.pos < end) {
            let tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.id = reader.string();
                    break;
                }
            case 2: {
                    message.name = reader.string();
                    break;
                }
            case 3: {
                    message.filetype = reader.string();
                    break;
                }
            case 4: {
                    message.content = reader.bytes();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a ModelItem message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ModelItem
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ModelItem} ModelItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ModelItem.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ModelItem message.
     * @function verify
     * @memberof ModelItem
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ModelItem.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.id != null && message.hasOwnProperty("id"))
            if (!$util.isString(message.id))
                return "id: string expected";
        if (message.name != null && message.hasOwnProperty("name"))
            if (!$util.isString(message.name))
                return "name: string expected";
        if (message.filetype != null && message.hasOwnProperty("filetype"))
            if (!$util.isString(message.filetype))
                return "filetype: string expected";
        if (message.content != null && message.hasOwnProperty("content"))
            if (!(message.content && typeof message.content.length === "number" || $util.isString(message.content)))
                return "content: buffer expected";
        return null;
    };

    /**
     * Creates a ModelItem message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ModelItem
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ModelItem} ModelItem
     */
    ModelItem.fromObject = function fromObject(object) {
        if (object instanceof $root.ModelItem)
            return object;
        let message = new $root.ModelItem();
        if (object.id != null)
            message.id = String(object.id);
        if (object.name != null)
            message.name = String(object.name);
        if (object.filetype != null)
            message.filetype = String(object.filetype);
        if (object.content != null)
            if (typeof object.content === "string")
                $util.base64.decode(object.content, message.content = $util.newBuffer($util.base64.length(object.content)), 0);
            else if (object.content.length >= 0)
                message.content = object.content;
        return message;
    };

    /**
     * Creates a plain object from a ModelItem message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ModelItem
     * @static
     * @param {ModelItem} message ModelItem
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ModelItem.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.id = "";
            object.name = "";
            object.filetype = "";
            if (options.bytes === String)
                object.content = "";
            else {
                object.content = [];
                if (options.bytes !== Array)
                    object.content = $util.newBuffer(object.content);
            }
        }
        if (message.id != null && message.hasOwnProperty("id"))
            object.id = message.id;
        if (message.name != null && message.hasOwnProperty("name"))
            object.name = message.name;
        if (message.filetype != null && message.hasOwnProperty("filetype"))
            object.filetype = message.filetype;
        if (message.content != null && message.hasOwnProperty("content"))
            object.content = options.bytes === String ? $util.base64.encode(message.content, 0, message.content.length) : options.bytes === Array ? Array.prototype.slice.call(message.content) : message.content;
        return object;
    };

    /**
     * Converts this ModelItem to JSON.
     * @function toJSON
     * @memberof ModelItem
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ModelItem.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ModelItem
     * @function getTypeUrl
     * @memberof ModelItem
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ModelItem.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ModelItem";
    };

    return ModelItem;
})();

export const ImageItem = $root.ImageItem = (() => {

    /**
     * Properties of an ImageItem.
     * @exports IImageItem
     * @interface IImageItem
     * @property {string|null} [id] ImageItem id
     * @property {string|null} [name] ImageItem name
     * @property {string|null} [filetype] ImageItem filetype
     * @property {Uint8Array|null} [content] ImageItem content
     */

    /**
     * Constructs a new ImageItem.
     * @exports ImageItem
     * @classdesc Represents an ImageItem.
     * @implements IImageItem
     * @constructor
     * @param {IImageItem=} [properties] Properties to set
     */
    function ImageItem(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ImageItem id.
     * @member {string} id
     * @memberof ImageItem
     * @instance
     */
    ImageItem.prototype.id = "";

    /**
     * ImageItem name.
     * @member {string} name
     * @memberof ImageItem
     * @instance
     */
    ImageItem.prototype.name = "";

    /**
     * ImageItem filetype.
     * @member {string} filetype
     * @memberof ImageItem
     * @instance
     */
    ImageItem.prototype.filetype = "";

    /**
     * ImageItem content.
     * @member {Uint8Array} content
     * @memberof ImageItem
     * @instance
     */
    ImageItem.prototype.content = $util.newBuffer([]);

    /**
     * Creates a new ImageItem instance using the specified properties.
     * @function create
     * @memberof ImageItem
     * @static
     * @param {IImageItem=} [properties] Properties to set
     * @returns {ImageItem} ImageItem instance
     */
    ImageItem.create = function create(properties) {
        return new ImageItem(properties);
    };

    /**
     * Encodes the specified ImageItem message. Does not implicitly {@link ImageItem.verify|verify} messages.
     * @function encode
     * @memberof ImageItem
     * @static
     * @param {IImageItem} message ImageItem message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ImageItem.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && Object.hasOwnProperty.call(message, "id"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
        if (message.filetype != null && Object.hasOwnProperty.call(message, "filetype"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.filetype);
        if (message.content != null && Object.hasOwnProperty.call(message, "content"))
            writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.content);
        return writer;
    };

    /**
     * Encodes the specified ImageItem message, length delimited. Does not implicitly {@link ImageItem.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ImageItem
     * @static
     * @param {IImageItem} message ImageItem message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ImageItem.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ImageItem message from the specified reader or buffer.
     * @function decode
     * @memberof ImageItem
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ImageItem} ImageItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ImageItem.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ImageItem();
        while (reader.pos < end) {
            let tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.id = reader.string();
                    break;
                }
            case 2: {
                    message.name = reader.string();
                    break;
                }
            case 3: {
                    message.filetype = reader.string();
                    break;
                }
            case 4: {
                    message.content = reader.bytes();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an ImageItem message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ImageItem
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ImageItem} ImageItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ImageItem.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ImageItem message.
     * @function verify
     * @memberof ImageItem
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ImageItem.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.id != null && message.hasOwnProperty("id"))
            if (!$util.isString(message.id))
                return "id: string expected";
        if (message.name != null && message.hasOwnProperty("name"))
            if (!$util.isString(message.name))
                return "name: string expected";
        if (message.filetype != null && message.hasOwnProperty("filetype"))
            if (!$util.isString(message.filetype))
                return "filetype: string expected";
        if (message.content != null && message.hasOwnProperty("content"))
            if (!(message.content && typeof message.content.length === "number" || $util.isString(message.content)))
                return "content: buffer expected";
        return null;
    };

    /**
     * Creates an ImageItem message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ImageItem
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ImageItem} ImageItem
     */
    ImageItem.fromObject = function fromObject(object) {
        if (object instanceof $root.ImageItem)
            return object;
        let message = new $root.ImageItem();
        if (object.id != null)
            message.id = String(object.id);
        if (object.name != null)
            message.name = String(object.name);
        if (object.filetype != null)
            message.filetype = String(object.filetype);
        if (object.content != null)
            if (typeof object.content === "string")
                $util.base64.decode(object.content, message.content = $util.newBuffer($util.base64.length(object.content)), 0);
            else if (object.content.length >= 0)
                message.content = object.content;
        return message;
    };

    /**
     * Creates a plain object from an ImageItem message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ImageItem
     * @static
     * @param {ImageItem} message ImageItem
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ImageItem.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.id = "";
            object.name = "";
            object.filetype = "";
            if (options.bytes === String)
                object.content = "";
            else {
                object.content = [];
                if (options.bytes !== Array)
                    object.content = $util.newBuffer(object.content);
            }
        }
        if (message.id != null && message.hasOwnProperty("id"))
            object.id = message.id;
        if (message.name != null && message.hasOwnProperty("name"))
            object.name = message.name;
        if (message.filetype != null && message.hasOwnProperty("filetype"))
            object.filetype = message.filetype;
        if (message.content != null && message.hasOwnProperty("content"))
            object.content = options.bytes === String ? $util.base64.encode(message.content, 0, message.content.length) : options.bytes === Array ? Array.prototype.slice.call(message.content) : message.content;
        return object;
    };

    /**
     * Converts this ImageItem to JSON.
     * @function toJSON
     * @memberof ImageItem
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ImageItem.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ImageItem
     * @function getTypeUrl
     * @memberof ImageItem
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ImageItem.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ImageItem";
    };

    return ImageItem;
})();

export { $root as default };
