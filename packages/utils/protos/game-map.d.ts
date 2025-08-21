import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a GameMap. */
export interface IGameMap {

    /** GameMap id */
    id?: (string|null);

    /** GameMap jsonData */
    jsonData?: (string|null);

    /** GameMap modelFiles */
    modelFiles?: (IModelItem[]|null);

    /** GameMap imageFiles */
    imageFiles?: (IImageItem[]|null);
}

/** Represents a GameMap. */
export class GameMap implements IGameMap {

    /**
     * Constructs a new GameMap.
     * @param [properties] Properties to set
     */
    constructor(properties?: IGameMap);

    /** GameMap id. */
    public id: string;

    /** GameMap jsonData. */
    public jsonData: string;

    /** GameMap modelFiles. */
    public modelFiles: IModelItem[];

    /** GameMap imageFiles. */
    public imageFiles: IImageItem[];

    /**
     * Creates a new GameMap instance using the specified properties.
     * @param [properties] Properties to set
     * @returns GameMap instance
     */
    public static create(properties?: IGameMap): GameMap;

    /**
     * Encodes the specified GameMap message. Does not implicitly {@link GameMap.verify|verify} messages.
     * @param message GameMap message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IGameMap, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified GameMap message, length delimited. Does not implicitly {@link GameMap.verify|verify} messages.
     * @param message GameMap message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IGameMap, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a GameMap message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns GameMap
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): GameMap;

    /**
     * Decodes a GameMap message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns GameMap
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): GameMap;

    /**
     * Verifies a GameMap message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a GameMap message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns GameMap
     */
    public static fromObject(object: { [k: string]: any }): GameMap;

    /**
     * Creates a plain object from a GameMap message. Also converts values to other types if specified.
     * @param message GameMap
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: GameMap, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this GameMap to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for GameMap
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a ModelItem. */
export interface IModelItem {

    /** ModelItem id */
    id?: (string|null);

    /** ModelItem name */
    name?: (string|null);

    /** ModelItem filetype */
    filetype?: (string|null);

    /** ModelItem content */
    content?: (Uint8Array|null);
}

/** Represents a ModelItem. */
export class ModelItem implements IModelItem {

    /**
     * Constructs a new ModelItem.
     * @param [properties] Properties to set
     */
    constructor(properties?: IModelItem);

    /** ModelItem id. */
    public id: string;

    /** ModelItem name. */
    public name: string;

    /** ModelItem filetype. */
    public filetype: string;

    /** ModelItem content. */
    public content: Uint8Array;

    /**
     * Creates a new ModelItem instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ModelItem instance
     */
    public static create(properties?: IModelItem): ModelItem;

    /**
     * Encodes the specified ModelItem message. Does not implicitly {@link ModelItem.verify|verify} messages.
     * @param message ModelItem message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IModelItem, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ModelItem message, length delimited. Does not implicitly {@link ModelItem.verify|verify} messages.
     * @param message ModelItem message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IModelItem, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ModelItem message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ModelItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ModelItem;

    /**
     * Decodes a ModelItem message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ModelItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ModelItem;

    /**
     * Verifies a ModelItem message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ModelItem message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ModelItem
     */
    public static fromObject(object: { [k: string]: any }): ModelItem;

    /**
     * Creates a plain object from a ModelItem message. Also converts values to other types if specified.
     * @param message ModelItem
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ModelItem, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ModelItem to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ModelItem
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an ImageItem. */
export interface IImageItem {

    /** ImageItem id */
    id?: (string|null);

    /** ImageItem name */
    name?: (string|null);

    /** ImageItem filetype */
    filetype?: (string|null);

    /** ImageItem content */
    content?: (Uint8Array|null);
}

/** Represents an ImageItem. */
export class ImageItem implements IImageItem {

    /**
     * Constructs a new ImageItem.
     * @param [properties] Properties to set
     */
    constructor(properties?: IImageItem);

    /** ImageItem id. */
    public id: string;

    /** ImageItem name. */
    public name: string;

    /** ImageItem filetype. */
    public filetype: string;

    /** ImageItem content. */
    public content: Uint8Array;

    /**
     * Creates a new ImageItem instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ImageItem instance
     */
    public static create(properties?: IImageItem): ImageItem;

    /**
     * Encodes the specified ImageItem message. Does not implicitly {@link ImageItem.verify|verify} messages.
     * @param message ImageItem message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IImageItem, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ImageItem message, length delimited. Does not implicitly {@link ImageItem.verify|verify} messages.
     * @param message ImageItem message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IImageItem, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an ImageItem message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ImageItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ImageItem;

    /**
     * Decodes an ImageItem message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ImageItem
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ImageItem;

    /**
     * Verifies an ImageItem message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an ImageItem message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ImageItem
     */
    public static fromObject(object: { [k: string]: any }): ImageItem;

    /**
     * Creates a plain object from an ImageItem message. Also converts values to other types if specified.
     * @param message ImageItem
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ImageItem, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ImageItem to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ImageItem
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}
