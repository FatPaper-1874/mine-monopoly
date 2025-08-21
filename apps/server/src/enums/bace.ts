export enum SocketMsgType {
    ConfirmIdentity = 1000, //确认身份(websocket从客户端获取id)
    Heart, //心跳信息
    MsgNotify, //纯信息广播
    UserList, //大厅玩家信息广播
    RoomList, //房间列表广播
    JoinRoom, //加入房间
    LeaveRoom, //离开房间
    RoomInfo, //房间信息广播
    RoomChat, //房间聊天
    ReadyToggle, //准备状态切换
    ChangeRole, //切换角色
    ChangeGameSetting, //修改游戏设置信息
    GameStart, //游戏开始
    GameInit, //游戏初始化
    GameInitFinished,	//游戏初始化完成
    GameInfo, //游戏信息广播
    RoundTurn, //更新当前回合轮到的玩家,
    RollDiceStart, //开始摇骰子
    RollDiceResult, //掷骰子
    UseChanceCard, //使用机会卡
    RemainingTime, //回合剩余时间
    RoundTimeOut, //回合超时
    PlayerWalk,	//位置移动方式1：玩家角色走路
    PlayerTp,	//位置移动方式2：传送
    Animation, //前端动画完成回馈
    BuyProperty, //购买地皮
    BuildHouse, //升级房子
    Bankrupt, //破产
    GameOver, //游戏结束
}

export enum WorkerCommType {
    LoadRoomOwner,
    LoadRoleListData,
    LoadMapListData,
    LoadGameMapData,

    RoomBroadcast,

}

export enum MonopolyWebSocketMsgType {
    Connected = 1,
    JoinRoom,
    CreateRoom,
    Step3,
    Error,
}

export enum ChangeRoleOperate {
    Prev, //上一个角色
    Next, //下一个角色
}

export enum ChanceCardType {
    ToSelf = "ToSelf",
    ToOtherPlayer = "ToOtherPlayer",
    ToPlayer = "ToPlayer",
    ToProperty = "ToProperty",
    ToMapItem = "ToMapItem",
}

export enum ChatMessageType {
    Emoticon, //表情
    Text, //文字
}
