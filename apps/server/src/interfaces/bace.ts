import {ChatMessageType, MonopolyWebSocketMsgType, SocketMsgType, WorkerCommType} from "../enums/bace";

export interface MonopolyWebSocketMsg {
    type: MonopolyWebSocketMsgType;
    data: any;
};

export interface WorkerCommMsg {
    type: WorkerCommType;
    data: any;
}

export interface SocketMessage {
    type: SocketMsgType;
    source: string;
    roomId?: string;
    data: any;
    msg?: {
        type: "info" | "success" | "warning" | "error" | "";
        content: string;
    };
    extra?: any;
}

export interface UserInDB {
    id: string;
    useraccount: string;
    username: string;
    avatar: string;
    color: string;
}

export interface User {
    userId: string;
    username: string;
    avatar: string;
    color: string;
}

export interface UserInRoom extends User {
    role: Role;
    isReady: boolean;
}

export interface Role {
    id: string;
    baseUrl: string;
    roleName: string;
    fileName: string;
    color: string;
}

export interface MapItem {
    _id: string;
    id: string;
    x: number;
    y: number;
    rotation: 0 | 1 | 2 | 3;
    type: ItemType;
    linkto?: MapItem;
    arrivedEvent?: ArrivedEvent;
    property?: Property;
}

export interface Property {
    id: string;
    name: string;
    sellCost: number;
    buildCost: number;
    cost_lv0: number;
    cost_lv1: number;
    cost_lv2: number;
    street: Street;
}

export interface ItemType {
    id: string;
    color: string;
    name: string;
    model: Model;
    size: number;
}

export interface Model {
    id: string;
    name: string;
    fileName: string;
}

export interface ArrivedEvent {
    id: string;
    name: string;
    describe: string;
    iconUrl: string;
    effectCode: string;
    mapItem: MapItem[];
}

export interface Street {
    id: string;
    name: string;
    increase: number;
}

export interface ChatUserInfo {
    userId: string;
    username: string;
    isReady: boolean;
    avatar: string;
    color: string;
    role: Role;
}

export interface ChatMessage {
    id: string;
    type: ChatMessageType;
    user: ChatUserInfo;
    content: string;
    time: number;
}


