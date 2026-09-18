import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import App from "./App";
afterEach(cleanup);
describe("首版页面框架",()=>{it("从首页进入城市地图",()=>{render(<App/>);fireEvent.click(screen.getByRole("button",{name:/开始体验/}));expect(screen.getByRole("heading",{name:"今天想去哪里？"})).toBeInTheDocument()});it("只有咖啡店可进入",()=>{render(<App/>);fireEvent.click(screen.getByRole("button",{name:/开始体验/}));expect(screen.getByRole("button",{name:/街角咖啡店/})).toBeEnabled();expect(screen.getByRole("button",{name:/同春市场/})).toBeDisabled()})});
