import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import App from "./App";
afterEach(cleanup);
describe("首版页面框架",()=>{it("从首页进入城市地图",()=>{render(<App/>);fireEvent.click(screen.getByRole("button",{name:/开始体验/}));expect(screen.getByRole("heading",{name:"今天，从河内出发。"})).toBeInTheDocument()});it("大地图提供城区切换和地点查找",()=>{render(<App/>);fireEvent.click(screen.getByRole("button",{name:/开始体验/}));expect(screen.getByRole("img",{name:/固定鸟瞰视角的河内立体城市/})).toBeInTheDocument();expect(screen.getByRole('navigation',{name:'地图分区'})).toBeInTheDocument();expect(screen.getByRole('combobox',{name:'查找景点或场景'})).toBeInTheDocument()})});
