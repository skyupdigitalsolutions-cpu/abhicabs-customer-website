import React from "react";
import { Provider } from "react-redux";
import { store } from "../store/store";
import Header from "./Header";
import Footer from "./Footer";
import ToastStack from "./ToastStack";
import LoginPopup from "./LoginPopup";
import "../styles/global.css";

export default function Layout({ children }) {
  return (
    <Provider store={store}>
      {/* Sticky-footer pattern: this wrapper is a full-viewport-height flex
          column, main grows to fill any leftover space (flex-1), so Footer
          sits glued to the bottom of the viewport on short pages instead of
          floating up in the middle — while still scrolling normally and
          appearing after the content on longer pages (it's never
          position:fixed, so it doesn't stay visible while scrolling over
          page content). */}
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <ToastStack />
      <LoginPopup />
    </Provider>
  );
}
