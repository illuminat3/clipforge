import { createRouter, createWebHistory } from "vue-router";
import ClipView from "../views/ClipView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/clip/:id",
      name: "clip",
      component: ClipView,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});
