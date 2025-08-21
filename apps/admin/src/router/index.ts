import {createRouter, createWebHashHistory, createWebHistory} from "vue-router";
import {menus, staticRoute} from "./menus";

const menuRoutes = menus.map((menu) => {
    const {path, name, component} = menu;
    return {path, name, component};
});

const routes = [
    {
        path: "/",
        alias: "/main",
        redirect: '/dashboard',
        name: "main",
        component: () => import('@/views/main.vue'),
        children: menuRoutes.concat(staticRoute)
    },
    {path: "/login", name: "login", component: () => import('@/views/login/login.vue')},
];


const router = createRouter({history: import.meta.env.PROD ? createWebHistory() : createWebHashHistory(), routes});

router.beforeEach(async (to, form) => {
    if (!["/login"].includes(to.path) && (!localStorage.getItem("token"))) {
        // 将用户重定向到登录页面
        return {path: "/login"};
    }
});

export default router;
