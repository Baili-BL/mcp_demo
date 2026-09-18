/**
 * Magic Patterns 抓取时把图标编成 Icon1…Icon26，已按用途改成语义名：
 * 侧栏 IconNav*：Overview / AppSquare / Workshop / Runtime / Sandbox / Skills /
 *   A2A / Session / Memory / Knowledge / Gateway / Identity / Evaluation / Observability
 * 子菜单箭头：IconChevronGateway（展开）、IconChevronEvaluation、IconChevronObservability
 * 页内：IconSiderCollapse、IconTutorialCaret、IconSearch、IconRefresh
 * 表头筛选：IconFilterStatus / Network / CallMode / GatewayMode
 * 空状态：IconEmptyState
 */
import React from "react";
import { render } from "react-dom";
import { IconNavOverview } from "./IconNavOverview";
import { IconNavAppSquare } from "./IconNavAppSquare";
import { IconNavWorkshop } from "./IconNavWorkshop";
import { IconNavRuntime } from "./IconNavRuntime";
import { IconNavSandbox } from "./IconNavSandbox";
import { IconNavSkills } from "./IconNavSkills";
import { IconNavA2A } from "./IconNavA2A";
import { IconNavSession } from "./IconNavSession";
import { IconNavMemory } from "./IconNavMemory";
import { IconNavKnowledge } from "./IconNavKnowledge";
import { IconNavGateway } from "./IconNavGateway";
import { IconChevronGateway } from "./IconChevronGateway";
import { IconNavIdentity } from "./IconNavIdentity";
import { IconNavEvaluation } from "./IconNavEvaluation";
import { IconChevronEvaluation } from "./IconChevronEvaluation";
import { IconNavObservability } from "./IconNavObservability";
import { IconChevronObservability } from "./IconChevronObservability";
import { IconSiderCollapse } from "./IconSiderCollapse";
import { IconTutorialCaret } from "./IconTutorialCaret";
import { IconSearch } from "./IconSearch";
import { IconRefresh } from "./IconRefresh";
import { IconFilterStatus } from "./IconFilterStatus";
import { IconFilterNetwork } from "./IconFilterNetwork";
import { IconFilterCallMode } from "./IconFilterCallMode";
import { IconFilterGatewayMode } from "./IconFilterGatewayMode";
import { IconEmptyState } from "./IconEmptyState";

export function Component() {
  return (
    <>
      <style>{`div {
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
iframe {
  outline-color: rgb(0, 0, 0);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;
  position: absolute;
  top: -20000px;
  width: 1px;
  height: 1px;

}
section {
  outline-color: rgb(0, 0, 0);
  outline-style: none;
  outline-width: 3px;
  display: flex;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0%;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
span {
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);

}
svg {
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
path {
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
button {
  font-family: Roboto, Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif, "Helvetica Neue", -apple-system, "system-ui", "noto sans";
  line-height: 20px;
  overflow-x: visible;
  overflow-y: visible;
  text-transform: none;
  appearance: none;
  outline-style: none;
  outline-width: 3px;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-block;
  font-weight: 500;
  position: relative;
  transition-behavior: normal;
  transition-duration: 0.1s;
  transition-timing-function: linear;
  transition-delay: 0s;
  transition-property: all;
  user-select: none;
  white-space-collapse: collapse;
  text-wrap-mode: nowrap;
  font-size: 13px;
  height: 32px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;
  border-radius: 4px;
  margin: 0px;

}
col {
  outline-color: rgb(0, 0, 0);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
tr {
  outline-color: rgb(0, 0, 0);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;
  padding: 0px;
  margin: 0px;

}
th {
  outline-color: rgb(66, 70, 78);
  outline-style: none;
  outline-width: 3px;
  font-size: 12px;
  background-color: rgb(246, 248, 250);
  box-sizing: border-box;
  color: rgb(66, 70, 78);
  font-weight: 500;
  line-height: 18.4615px;
  text-align: left;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;
  border-bottom: 1px solid rgb(234, 237, 241);
  padding: 0px;
  margin: 0px;

}
g {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
rect {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
lineargradient {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
stop {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
filter {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
feflood {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
fecolormatrix {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
feoffset {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
fegaussianblur {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
fecomposite {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
feblend {
  outline-color: rgb(169, 174, 184);
  outline-style: none;
  outline-width: 3px;
  scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0);
  scrollbar-width: thin;

}
`}</style>
      <div
        id="container"
        style={{
          height: "738px",
          position: "relative",
          outlineColor: "rgb(0, 0, 0)",
          width: "100%",
          backgroundColor: "rgb(246, 246, 252)",
          color: "rgb(0, 0, 0)",
          fontSize: "12px",
          lineHeight: "18px",
          fontFamily:
            'Roboto, Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif, "Helvetica Neue", -apple-system, "system-ui", "noto sans"',
        }}
      >
        <div id="navbar" style={{ outlineColor: "rgb(0, 0, 0)" }}>
          <iframe src="about:blank" style={{}}></iframe>
          <div
            id="garfish_app_for_navbar_2e1kfklf"
            style={{ outlineColor: "rgb(0, 0, 0)" }}
          ></div>
        </div>

        <div
          id="root"
          style={{
            position: "relative",
            overflowX: "auto",
            overflowY: "auto",
            height: "678px",
            outlineColor: "rgb(0, 0, 0)",
            backgroundColor: "rgb(246, 246, 252)",
          }}
        >
          <section
            style={{
              flexDirection: "row",
              height: "678px",
              padding: "0px",
              margin: "0px",
            }}
          >
            <div
              style={{
                outlineColor: "rgb(0, 0, 0)",
                backgroundColor: "rgb(246, 246, 252)",
                display: "flex",
                flexDirection: "column",
                height: "678px",
                justifyContent: "space-between",
                position: "relative",
                transitionBehavior: "normal",
                transitionDuration: "0.2s",
                transitionTimingFunction: "cubic-bezier(0.34, 0.69, 0.1, 1)",
                transitionDelay: "0s",
                transitionProperty: "width",
                width: "200px",
              }}
            >
              <div
                role="menu"
                style={{
                  outlineColor: "rgb(0, 0, 0)",
                  boxSizing: "border-box",
                  fontSize: "14px",
                  lineHeight: "21.5385px",
                  position: "relative",
                  transitionBehavior: "normal",
                  transitionDuration: "0.2s",
                  transitionTimingFunction: "cubic-bezier(0.34, 0.69, 0.1, 1)",
                  transitionDelay: "0s",
                  transitionProperty: "width",
                  width: "200px",
                  backgroundColor: "rgb(246, 246, 252)",
                  height: "614px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    outlineColor: "rgb(0, 0, 0)",
                    boxSizing: "border-box",
                    height: "788px",
                    overflowX: "hidden",
                    overflowY: "hidden",
                    width: "200px",
                    padding: "8px 0px 8px 8px",
                  }}
                >
                  <div
                    style={{
                      outlineColor: "rgb(0, 0, 0)",
                      alignItems: "center",
                      boxSizing: "border-box",
                      display: "flex",
                      paddingRight: "8px",
                      textOverflow: "ellipsis",
                      whiteSpaceCollapse: "collapse",
                      textWrapMode: "nowrap",
                    }}
                  >
                    <div
                      style={{
                        outlineColor: "rgb(12, 13, 14)",
                        color: "rgb(12, 13, 14)",
                        flexGrow: "1",
                        flexShrink: "1",
                        flexBasis: "0%",
                        fontSize: "16px",
                        fontWeight: "500",
                        minWidth: "0px",
                        whiteSpaceCollapse: "collapse",
                        textWrapMode: "wrap",
                      }}
                    ></div>
                  </div>
                  <div
                    style={{
                      outlineColor: "rgb(0, 0, 0)",
                      overflowX: "hidden",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      tabindex="0"
                      role="menuitem"
                      type="Item"
                      path="/overview"
                      style={{
                        outlineColor: "rgb(66, 70, 78)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: "rgb(246, 246, 252)",
                        color: "rgb(66, 70, 78)",
                        lineHeight: "normal",
                        marginBottom: "4px",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpaceCollapse: "collapse",
                        textWrapMode: "nowrap",
                        display: "flex",
                        borderRadius: "8px",
                        padding: "0px 8px 0px 8px",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          alignItems: "center",
                          display: "flex",
                          height: "36px",
                          justifyContent: "space-between",
                          minWidth: "36px",
                        }}
                      >
                        <div
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            alignItems: "center",
                            display: "flex",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            width: "56px",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              position: "relative",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                height: "36px",
                                lineHeight: "normal",
                                display: "flex",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconNavOverview
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  color: "rgb(66, 70, 78)",
                                  display: "block",
                                  fontStyle: "normal",
                                  height: "18px",
                                  verticalAlign: "-2px",
                                  width: "18px",
                                  marginRight: "10px",
                                  fontSize: "18px",
                                  flexShrink: "0",
                                }}
                              />
                              <span
                                style={{
                                  outlineColor: "rgb(12, 13, 14)",
                                  maxWidth: "110px",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  color: "rgb(12, 13, 14)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                概览
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      tabindex="0"
                      role="menuitem"
                      type="Item"
                      path="/application"
                      style={{
                        outlineColor: "rgb(66, 70, 78)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: "rgb(246, 246, 252)",
                        color: "rgb(66, 70, 78)",
                        lineHeight: "normal",
                        marginBottom: "4px",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpaceCollapse: "collapse",
                        textWrapMode: "nowrap",
                        display: "flex",
                        borderRadius: "8px",
                        padding: "0px 8px 0px 8px",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          alignItems: "center",
                          display: "flex",
                          height: "36px",
                          justifyContent: "space-between",
                          minWidth: "36px",
                        }}
                      >
                        <div
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            alignItems: "center",
                            display: "flex",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            width: "84px",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              position: "relative",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                height: "36px",
                                lineHeight: "normal",
                                display: "flex",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconNavAppSquare
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  color: "rgb(66, 70, 78)",
                                  display: "block",
                                  fontStyle: "normal",
                                  height: "18px",
                                  verticalAlign: "-2px",
                                  width: "18px",
                                  marginRight: "10px",
                                  fontSize: "18px",
                                  flexShrink: "0",
                                }}
                              />
                              <span
                                style={{
                                  outlineColor: "rgb(12, 13, 14)",
                                  maxWidth: "110px",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  color: "rgb(12, 13, 14)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                应用广场
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      tabindex="0"
                      role="menuitem"
                      type="Item"
                      path="/agentspace"
                      style={{
                        outlineColor: "rgb(66, 70, 78)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: "rgb(246, 246, 252)",
                        color: "rgb(66, 70, 78)",
                        lineHeight: "normal",
                        marginBottom: "4px",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpaceCollapse: "collapse",
                        textWrapMode: "nowrap",
                        display: "flex",
                        borderRadius: "8px",
                        padding: "0px 8px 0px 8px",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          alignItems: "center",
                          display: "flex",
                          height: "36px",
                          justifyContent: "space-between",
                          minWidth: "36px",
                        }}
                      >
                        <div
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            alignItems: "center",
                            display: "flex",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            width: "84px",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              position: "relative",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                height: "36px",
                                lineHeight: "normal",
                                display: "flex",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconNavWorkshop
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  color: "rgb(66, 70, 78)",
                                  display: "block",
                                  fontStyle: "normal",
                                  height: "18px",
                                  verticalAlign: "-2px",
                                  width: "18px",
                                  marginRight: "10px",
                                  fontSize: "18px",
                                  flexShrink: "0",
                                }}
                              />
                              <span
                                style={{
                                  outlineColor: "rgb(12, 13, 14)",
                                  maxWidth: "110px",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  color: "rgb(12, 13, 14)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                智能工坊
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        outlineColor: "rgb(0, 0, 0)",
                        marginBottom: "4px",
                        marginTop: "16px",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(122, 120, 128)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(122, 120, 128)",
                          pointerEvents: "none",
                          lineHeight: "28px",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          fontSize: "12px",
                          height: "28px",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(122, 120, 128)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          基础组件
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/runtime"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavRuntime
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    智能体运行时
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/builtintools"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavSandbox
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    沙箱模板
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/skillcenter"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavSkills
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    Skills 中心
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/a2acenter"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavA2A
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    A2A 中心
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/session"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavSession
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    会话管理
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/memory"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavMemory
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    记忆库
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/knowledge"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavKnowledge
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    知识库
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                      <div
                        _key="gateway"
                        style={{ outlineColor: "rgb(0, 0, 0)" }}
                      >
                        <div
                          type="SubMenu"
                          style={{ outlineColor: "rgb(0, 0, 0)" }}
                        >
                          <div
                            tabindex="0"
                            aria-expanded="true"
                            aria-controls="arco-menu-3-submenu-inline-9"
                            style={{
                              outlineColor: "rgb(22, 100, 255)",
                              boxSizing: "border-box",
                              cursor: "pointer",
                              position: "relative",
                              fontWeight: "500",
                              transitionBehavior: "normal",
                              transitionDuration: "0.2s",
                              transitionTimingFunction: "linear",
                              transitionDelay: "0s",
                              transitionProperty: "color",
                              backgroundColor: "rgb(246, 246, 252)",
                              color: "rgb(22, 100, 255)",
                              lineHeight: "normal",
                              marginBottom: "4px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpaceCollapse: "collapse",
                              textWrapMode: "nowrap",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              borderRadius: "8px",
                              padding: "0px 8px 0px 8px",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(22, 100, 255)",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(22, 100, 255)",
                                  display: "inline-block",
                                  width: "0px",
                                  scrollbarWidth: "thin",
                                }}
                              ></span>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(22, 100, 255)",
                                display: "block",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(22, 100, 255)",
                                  alignItems: "center",
                                  display: "flex",
                                  width: "136px",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(22, 100, 255)",
                                    fontWeight: "400",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(22, 100, 255)",
                                      alignItems: "center",
                                      display: "flex",
                                    }}
                                  >
                                    <IconNavGateway
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        transitionBehavior: "normal",
                                        transitionDuration: "0.2s",
                                        transitionTimingFunction: "linear",
                                        transitionDelay: "0s",
                                        transitionProperty: "color",
                                        color: "rgb(66, 70, 78)",
                                        display: "block",
                                        fontStyle: "normal",
                                        height: "18px",
                                        verticalAlign: "-2px",
                                        width: "18px",
                                        marginRight: "10px",
                                        fontSize: "18px",
                                      }}
                                    />
                                    <span
                                      style={{
                                        outlineColor: "rgb(12, 13, 14)",
                                        maxWidth: "110px",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpaceCollapse: "collapse",
                                        textWrapMode: "nowrap",
                                        color: "rgb(12, 13, 14)",
                                        scrollbarWidth: "thin",
                                      }}
                                    >
                                      网关
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(22, 100, 255)",
                                position: "absolute",
                                right: "12px",
                                top: "18px",
                                transform: "matrix(-1, 0, 0, -1, 0, -6)",
                                alignItems: "center",
                                display: "flex",
                                height: "12px",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconChevronGateway
                                style={{
                                  outlineColor: "rgb(22, 100, 255)",
                                  transitionBehavior: "normal",
                                  transitionDuration: "0.2s",
                                  transitionTimingFunction: "linear",
                                  transitionDelay: "0s",
                                  transitionProperty: "color",
                                }}
                              />
                            </span>
                          </div>
                          <div
                            id="arco-menu-3-submenu-inline-9"
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              height: "120px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              transitionBehavior: "normal",
                              transitionDuration: "0.2s",
                              transitionTimingFunction:
                                "cubic-bezier(0.34, 0.69, 0.1, 1)",
                              transitionDelay: "0s",
                              transitionProperty: "height",
                            }}
                          >
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/gateway/instance"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          网关实例
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/gateway/mcpservice"
                              style={{
                                outlineColor: "rgb(12, 13, 14)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                fontWeight: "500",
                                transitionBehavior: "normal",
                                transitionDuration: "0.2s",
                                transitionTimingFunction: "linear",
                                transitionDelay: "0s",
                                transitionProperty: "color",
                                backgroundColor: "rgb(235, 235, 245)",
                                color: "rgb(12, 13, 14)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                fontSize: "14px",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(12, 13, 14)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(12, 13, 14)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(12, 13, 14)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(12, 13, 14)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(12, 13, 14)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(12, 13, 14)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(12, 13, 14)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          MCP
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/gateway/modelgateway"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          模型服务
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        tabindex="0"
                        role="menuitem"
                        type="Item"
                        path="/identity"
                        style={{
                          outlineColor: "rgb(66, 70, 78)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(66, 70, 78)",
                          lineHeight: "normal",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          display: "flex",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          <span
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              display: "inline-block",
                              width: "0px",
                              scrollbarWidth: "thin",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            outlineColor: "rgb(66, 70, 78)",
                            overflowX: "hidden",
                            overflowY: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpaceCollapse: "collapse",
                            textWrapMode: "nowrap",
                            width: "176px",
                            scrollbarWidth: "thin",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              justifyContent: "space-between",
                              minWidth: "36px",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                display: "flex",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                width: "176px",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  position: "relative",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    height: "36px",
                                    lineHeight: "normal",
                                    display: "flex",
                                    scrollbarWidth: "thin",
                                  }}
                                >
                                  <IconNavIdentity
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      color: "rgb(66, 70, 78)",
                                      display: "block",
                                      fontStyle: "normal",
                                      height: "18px",
                                      verticalAlign: "-2px",
                                      width: "18px",
                                      marginRight: "10px",
                                      fontSize: "18px",
                                      flexShrink: "0",
                                    }}
                                  />
                                  <span
                                    style={{
                                      outlineColor: "rgb(12, 13, 14)",
                                      maxWidth: "110px",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpaceCollapse: "collapse",
                                      textWrapMode: "nowrap",
                                      color: "rgb(12, 13, 14)",
                                      scrollbarWidth: "thin",
                                    }}
                                  >
                                    身份与权限
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        outlineColor: "rgb(0, 0, 0)",
                        marginBottom: "4px",
                        marginTop: "16px",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(122, 120, 128)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          position: "relative",
                          backgroundColor: "rgb(246, 246, 252)",
                          color: "rgb(122, 120, 128)",
                          pointerEvents: "none",
                          lineHeight: "28px",
                          marginBottom: "4px",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpaceCollapse: "collapse",
                          textWrapMode: "nowrap",
                          fontSize: "12px",
                          height: "28px",
                          borderRadius: "8px",
                          padding: "0px 8px 0px 8px",
                        }}
                      >
                        <span
                          style={{
                            outlineColor: "rgb(122, 120, 128)",
                            scrollbarWidth: "thin",
                          }}
                        >
                          评估
                        </span>
                      </div>
                      <div
                        _key="evaluation"
                        style={{ outlineColor: "rgb(0, 0, 0)" }}
                      >
                        <div
                          type="SubMenu"
                          style={{ outlineColor: "rgb(0, 0, 0)" }}
                        >
                          <div
                            tabindex="0"
                            aria-expanded="false"
                            aria-controls="arco-menu-3-submenu-inline-10"
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              boxSizing: "border-box",
                              cursor: "pointer",
                              position: "relative",
                              backgroundColor: "rgb(246, 246, 252)",
                              color: "rgb(66, 70, 78)",
                              lineHeight: "normal",
                              marginBottom: "4px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpaceCollapse: "collapse",
                              textWrapMode: "nowrap",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              borderRadius: "8px",
                              padding: "0px 8px 0px 8px",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  display: "inline-block",
                                  width: "0px",
                                  scrollbarWidth: "thin",
                                }}
                              ></span>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                display: "block",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  alignItems: "center",
                                  display: "flex",
                                  width: "136px",
                                }}
                              >
                                <div
                                  style={{ outlineColor: "rgb(66, 70, 78)" }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                    }}
                                  >
                                    <IconNavEvaluation
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        color: "rgb(66, 70, 78)",
                                        display: "block",
                                        fontStyle: "normal",
                                        height: "18px",
                                        verticalAlign: "-2px",
                                        width: "18px",
                                        marginRight: "10px",
                                        fontSize: "18px",
                                      }}
                                    />
                                    <span
                                      style={{
                                        outlineColor: "rgb(12, 13, 14)",
                                        maxWidth: "110px",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpaceCollapse: "collapse",
                                        textWrapMode: "nowrap",
                                        color: "rgb(12, 13, 14)",
                                        scrollbarWidth: "thin",
                                      }}
                                    >
                                      评测
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                position: "absolute",
                                right: "12px",
                                top: "18px",
                                transform: "matrix(1, 0, 0, 1, 0, -6)",
                                alignItems: "center",
                                display: "flex",
                                height: "12px",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconChevronEvaluation
                                style={{ outlineColor: "rgb(66, 70, 78)" }}
                              />
                            </span>
                          </div>
                          <div
                            id="arco-menu-3-submenu-inline-10"
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              height: "0px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              transitionBehavior: "normal",
                              transitionDuration: "0.2s",
                              transitionTimingFunction:
                                "cubic-bezier(0.34, 0.69, 0.1, 1)",
                              transitionDelay: "0s",
                              transitionProperty: "height",
                              visibility: "hidden",
                            }}
                          >
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/evaluation/experiment"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          实验评测
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/evaluation/dataset"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          评测集管理
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/evaluation/evaluator"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          实验评估器管理
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        _key="apmplus"
                        style={{ outlineColor: "rgb(0, 0, 0)" }}
                      >
                        <div
                          type="SubMenu"
                          style={{ outlineColor: "rgb(0, 0, 0)" }}
                        >
                          <div
                            tabindex="0"
                            aria-expanded="false"
                            aria-controls="arco-menu-3-submenu-inline-11"
                            style={{
                              outlineColor: "rgb(66, 70, 78)",
                              boxSizing: "border-box",
                              cursor: "pointer",
                              position: "relative",
                              backgroundColor: "rgb(246, 246, 252)",
                              color: "rgb(66, 70, 78)",
                              lineHeight: "normal",
                              marginBottom: "4px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpaceCollapse: "collapse",
                              textWrapMode: "nowrap",
                              alignItems: "center",
                              display: "flex",
                              height: "36px",
                              borderRadius: "8px",
                              padding: "0px 8px 0px 8px",
                            }}
                          >
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  display: "inline-block",
                                  width: "0px",
                                  scrollbarWidth: "thin",
                                }}
                              ></span>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                display: "block",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  alignItems: "center",
                                  display: "flex",
                                  width: "136px",
                                }}
                              >
                                <div
                                  style={{ outlineColor: "rgb(66, 70, 78)" }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                    }}
                                  >
                                    <IconNavObservability
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        color: "rgb(66, 70, 78)",
                                        display: "block",
                                        fontStyle: "normal",
                                        height: "18px",
                                        verticalAlign: "-2px",
                                        width: "18px",
                                        marginRight: "10px",
                                        fontSize: "18px",
                                      }}
                                    />
                                    <span
                                      style={{
                                        outlineColor: "rgb(12, 13, 14)",
                                        maxWidth: "110px",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpaceCollapse: "collapse",
                                        textWrapMode: "nowrap",
                                        color: "rgb(12, 13, 14)",
                                        scrollbarWidth: "thin",
                                      }}
                                    >
                                      可观测
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </span>
                            <span
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                position: "absolute",
                                right: "12px",
                                top: "18px",
                                transform: "matrix(1, 0, 0, 1, 0, -6)",
                                alignItems: "center",
                                display: "flex",
                                height: "12px",
                                scrollbarWidth: "thin",
                              }}
                            >
                              <IconChevronObservability
                                style={{ outlineColor: "rgb(66, 70, 78)" }}
                              />
                            </span>
                          </div>
                          <div
                            id="arco-menu-3-submenu-inline-11"
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              height: "0px",
                              overflowX: "hidden",
                              overflowY: "hidden",
                              transitionBehavior: "normal",
                              transitionDuration: "0.2s",
                              transitionTimingFunction:
                                "cubic-bezier(0.34, 0.69, 0.1, 1)",
                              transitionDelay: "0s",
                              transitionProperty: "height",
                              visibility: "hidden",
                            }}
                          >
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/apmplus"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          应用观测
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                            <div
                              tabindex="0"
                              role="menuitem"
                              type="Item"
                              path="/apmplus/online-export"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                position: "relative",
                                backgroundColor: "rgb(246, 246, 252)",
                                color: "rgb(66, 70, 78)",
                                lineHeight: "normal",
                                marginBottom: "4px",
                                overflowX: "hidden",
                                overflowY: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpaceCollapse: "collapse",
                                textWrapMode: "nowrap",
                                display: "flex",
                                borderRadius: "8px",
                                padding: "0px 8px 0px 8px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "0px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "inline-block",
                                    width: "28px",
                                    scrollbarWidth: "thin",
                                  }}
                                ></span>
                              </span>
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  overflowX: "hidden",
                                  overflowY: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpaceCollapse: "collapse",
                                  textWrapMode: "nowrap",
                                  width: "148px",
                                  scrollbarWidth: "thin",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    alignItems: "center",
                                    display: "flex",
                                    height: "36px",
                                    justifyContent: "space-between",
                                    minWidth: "36px",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(66, 70, 78)",
                                      alignItems: "center",
                                      display: "flex",
                                      overflowX: "hidden",
                                      overflowY: "hidden",
                                      width: "148px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(66, 70, 78)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        position: "relative",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(66, 70, 78)",
                                          alignItems: "center",
                                          height: "36px",
                                          lineHeight: "normal",
                                          display: "flex",
                                          scrollbarWidth: "thin",
                                        }}
                                      >
                                        <span
                                          style={{
                                            outlineColor: "rgb(12, 13, 14)",
                                            maxWidth: "110px",
                                            overflowX: "hidden",
                                            overflowY: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpaceCollapse: "collapse",
                                            textWrapMode: "nowrap",
                                            color: "rgb(12, 13, 14)",
                                            scrollbarWidth: "thin",
                                          }}
                                        >
                                          数据回流
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  outlineColor: "rgb(0, 0, 0)",
                  alignItems: "center",
                  backgroundColor: "rgb(246, 246, 252)",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  display: "flex",
                  height: "54px",
                  borderTop: "0.5px solid rgb(210, 209, 224)",
                  margin: "0px 4px 0px 12px",
                }}
              >
                <div
                  style={{
                    outlineColor: "rgb(0, 0, 0)",
                    alignItems: "center",
                    display: "flex",
                    height: "24px",
                    justifyContent: "center",
                    width: "24px",
                    borderRadius: "0px 4px 4px 0px",
                  }}
                >
                  <IconSiderCollapse style={{ outlineColor: "rgb(0, 0, 0)" }} />
                </div>
              </div>
              <div
                style={{
                  outlineColor: "rgb(0, 0, 0)",
                  height: "40px",
                  display: "none",
                }}
              ></div>
            </div>
            <main
              style={{
                backgroundColor: "rgb(255, 255, 255)",
                width: "1296px",
                height: "678px",
                overflowY: "auto",
                scrollbarGutter: "auto",
                display: "block",
                outlineColor: "rgb(0, 0, 0)",
                outlineStyle: "none",
                outlineWidth: "3px",
                flexGrow: "1",
                flexShrink: "1",
                flexBasis: "0%",
                overflowX: "hidden",
                scrollbarColor: "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                scrollbarWidth: "thin",
                borderRadius: "12px",
                padding: "0px",
                margin: "0px 8px 8px 8px",
              }}
            >
              <section
                style={{
                  flexDirection: "column",
                  backgroundColor: "rgb(255, 255, 255)",
                  minHeight: "100%",
                  position: "relative",
                  content: "normal",
                  height: "678px",
                  left: "0px",
                  right: "0px",
                  top: "0px",
                  zIndex: "auto",
                  padding: "0px",
                  margin: "0px",
                }}
              >
                <span
                  style={{
                    outlineColor: "rgb(0, 0, 0)",
                    display: "block",
                    flexGrow: "0",
                    flexShrink: "1",
                    flexBasis: "auto",
                    flexDirection: "row",
                    scrollbarWidth: "auto",
                    backgroundImage:
                      'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNDEzIiBoZWlnaHQ9IjE3NiIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTAgMGgxNDEzdjE3NkgweiIvPjxwYXRoIGZpbGw9InVybCgjYikiIGQ9Ik0wIDBoMTQxM3YxNzZIMHoiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIxMTczLjQiIHgyPSIzMjguNTUiIHkxPSItMTIwLjUiIHkyPSI0MTkuNzIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBzdG9wLWNvbG9yPSIjZjhmNGVmIi8+PHN0b3Agb2Zmc2V0PSIuMzg3IiBzdG9wLWNvbG9yPSIjZjllY2U5Ii8+PHN0b3Agb2Zmc2V0PSIuNzAzIiBzdG9wLWNvbG9yPSIjZDZjN2ViIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZjVmNmY4Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImIiIHgxPSI3MDYuNSIgeDI9IjcwNi41IiB5MT0iMCIgeTI9IjE3NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIHN0b3AtY29sb3I9IiNlZWYwZjQiIHN0b3Atb3BhY2l0eT0iMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2Y0ZjVmNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==")',
                    backgroundPositionX: "0px",
                    backgroundPositionY: "0px",
                    backgroundSize: "100% auto",
                    backgroundRepeat: "no-repeat",
                    backgroundAttachment: "scroll",
                    backgroundOrigin: "padding-box",
                    backgroundClip: "border-box",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    minHeight: "0px",
                    position: "absolute",
                    content: '""',
                    height: "80px",
                    left: "0px",
                    right: "0px",
                    top: "0px",
                    zIndex: "1",
                    padding: "0px",
                    margin: "0px",
                  }}
                ></span>
                <header
                  style={{
                    outlineColor: "rgb(115, 122, 135)",
                    outlineStyle: "none",
                    outlineWidth: "3px",
                    boxSizing: "border-box",
                    flexGrow: "0",
                    flexShrink: "0",
                    flexBasis: "auto",
                    scrollbarColor: "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                    scrollbarWidth: "thin",
                    alignItems: "center",
                    backgroundColor: "rgb(255, 255, 255)",
                    color: "rgb(115, 122, 135)",
                    display: "flex",
                    fontSize: "13px",
                    justifyContent: "space-between",
                    lineHeight: "22px",
                    minHeight: "80px",
                    position: "relative",
                    verticalAlign: "bottom",
                    width: "1296px",
                    zIndex: "2",
                    borderRadius: "0px",
                    padding: "24px 32px 24px 32px",
                    margin: "0px",
                  }}
                >
                  <div
                    style={{
                      outlineColor: "rgb(115, 122, 135)",
                      width: "1232px",
                    }}
                  >
                    <div
                      style={{
                        outlineColor: "rgb(12, 13, 14)",
                        color: "rgb(12, 13, 14)",
                        fontSize: "24px",
                        fontWeight: "500",
                      }}
                    >
                      <div
                        style={{
                          outlineColor: "rgb(12, 13, 14)",
                          color: "rgb(12, 13, 14)",
                          fontSize: "20px",
                          height: "32px",
                          lineHeight: "32px",
                        }}
                      >
                        MCP 中心
                      </div>
                    </div>
                    <div style={{ outlineColor: "rgb(115, 122, 135)" }}>
                      <div
                        style={{
                          outlineColor: "rgb(115, 122, 135)",
                          alignItems: "center",
                          color: "rgb(115, 122, 135)",
                          display: "flex",
                          justifyContent: "space-between",
                          lineHeight: "20px",
                          paddingRight: "24px",
                        }}
                      >
                        <div style={{ outlineColor: "rgb(115, 122, 135)" }}>
                          AgentKit MCP 服务为 MCP 服务提供安全可靠的访问入口
                          ，支持一键将存量 API 一键转换为
                          MCP，快速将存量系统对接到大模型。AgentKit MCP
                          工具集支持工具的灵活组合，并提供语义/标签检索模式自动匹配最相关的工具，提高工具调用准确性并降低
                          Token 消耗。
                        </div>
                        <div
                          style={{
                            outlineColor: "rgb(86, 82, 255)",
                            color: "rgb(86, 82, 255)",
                            cursor: "pointer",
                            flexShrink: "0",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(86, 82, 255)",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(86, 82, 255)",
                                marginRight: "4px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(86, 82, 255)",
                                  scrollbarWidth: "thin",
                                }}
                              >
                                查看教程
                              </span>
                            </div>
                            <div style={{ outlineColor: "rgb(86, 82, 255)" }}>
                              <IconTutorialCaret
                                style={{
                                  outlineColor: "rgb(86, 82, 255)",
                                  color: "rgb(86, 82, 255)",
                                  display: "inline-block",
                                  fontStyle: "normal",
                                  height: "13px",
                                  stroke: "rgb(86, 82, 255)",
                                  verticalAlign: "-2px",
                                  width: "13px",
                                  fill: "none",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ outlineColor: "rgb(115, 122, 135)" }}></div>
                </header>
                <section
                  style={{
                    flexDirection: "column",
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    position: "relative",
                    padding: "0px 32px 24px 32px",
                    margin: "10px 0px 0px 0px",
                  }}
                >
                  <div
                    style={{
                      outlineColor: "rgb(0, 0, 0)",
                      overflowX: "hidden",
                      overflowY: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        outlineColor: "rgb(0, 0, 0)",
                        position: "relative",
                        backgroundColor: "rgba(0, 0, 0, 0)",
                        bottom: "0px",
                        clear: "none",
                        content: "normal",
                        display: "block",
                        height: "40px",
                        left: "0px",
                        right: "0px",
                      }}
                    >
                      <span
                        style={{
                          outlineColor: "rgb(0, 0, 0)",
                          position: "absolute",
                          backgroundColor: "rgb(229, 230, 235)",
                          bottom: "0px",
                          clear: "both",
                          content: '""',
                          display: "block",
                          height: "1px",
                          left: "0px",
                          right: "0px",
                          scrollbarWidth: "auto",
                        }}
                      ></span>
                      <div
                        style={{
                          outlineColor: "rgb(0, 0, 0)",
                          alignItems: "center",
                          display: "flex",
                          overflowX: "hidden",
                          overflowY: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            outlineColor: "rgb(0, 0, 0)",
                            display: "flex",
                            flexGrow: "1",
                            flexShrink: "1",
                            flexBasis: "0%",
                            overflowX: "hidden",
                            overflowY: "hidden",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              display: "block",
                              position: "relative",
                              transitionBehavior: "normal",
                              transitionDuration: "0.2s",
                              transitionTimingFunction:
                                "cubic-bezier(0.34, 0.69, 0.1, 1)",
                              transitionDelay: "0s",
                              transitionProperty: "transform",
                              whiteSpaceCollapse: "collapse",
                              textWrapMode: "nowrap",
                              transform: "matrix(1, 0, 0, 1, 0, 0)",
                            }}
                          >
                            <div
                              role="tab"
                              aria-selected="false"
                              tabindex="0"
                              id="arco-tabs-8-tab-0"
                              aria-controls="arco-tabs-8-panel-0"
                              style={{
                                outlineColor: "rgb(66, 70, 78)",
                                alignItems: "center",
                                boxSizing: "border-box",
                                color: "rgb(66, 70, 78)",
                                cursor: "pointer",
                                display: "inline-flex",
                                fontSize: "14px",
                                lineHeight: "22.001px",
                                transitionBehavior: "normal",
                                transitionDuration: "0.2s",
                                transitionTimingFunction: "linear",
                                transitionDelay: "0s",
                                transitionProperty: "color",
                                padding: "8px 0px 8px 0px",
                                margin: "0px 16px 0px 0px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(66, 70, 78)",
                                  display: "block",
                                  position: "relative",
                                  backgroundColor: "rgba(0, 0, 0, 0)",
                                  bottom: "0px",
                                  content: "normal",
                                  left: "0px",
                                  right: "0px",
                                  top: "0px",
                                  transitionBehavior: "normal",
                                  transitionDuration: "0s",
                                  transitionTimingFunction: "ease",
                                  transitionDelay: "0s",
                                  transitionProperty: "all",
                                  zIndex: "auto",
                                  scrollbarWidth: "thin",
                                  borderRadius: "0px",
                                  padding: "1px 0px 1px 0px",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(66, 70, 78)",
                                    display: "block",
                                    position: "absolute",
                                    backgroundColor: "rgba(0, 0, 0, 0)",
                                    bottom: "0px",
                                    content: '""',
                                    left: "-8px",
                                    right: "-8px",
                                    top: "0px",
                                    transitionBehavior: "normal",
                                    transitionDuration: "0.2s",
                                    transitionTimingFunction: "linear",
                                    transitionDelay: "0s",
                                    transitionProperty: "all",
                                    zIndex: "-1",
                                    scrollbarWidth: "auto",
                                    borderRadius: "4px",
                                    padding: "0px",
                                  }}
                                ></span>
                                MCP 服务
                              </span>
                            </div>
                            <div
                              role="tab"
                              aria-selected="true"
                              tabindex="0"
                              id="arco-tabs-8-tab-1"
                              aria-controls="arco-tabs-8-panel-1"
                              style={{
                                outlineColor: "rgb(22, 100, 255)",
                                alignItems: "center",
                                boxSizing: "border-box",
                                color: "rgb(22, 100, 255)",
                                cursor: "pointer",
                                display: "inline-flex",
                                fontSize: "14px",
                                lineHeight: "22.001px",
                                transitionBehavior: "normal",
                                transitionDuration: "0.2s",
                                transitionTimingFunction: "linear",
                                transitionDelay: "0s",
                                transitionProperty: "color",
                                fontWeight: "500",
                                padding: "8px 0px 8px 0px",
                                margin: "0px 16px 0px 16px",
                              }}
                            >
                              <span
                                style={{
                                  outlineColor: "rgb(22, 100, 255)",
                                  display: "block",
                                  position: "relative",
                                  backgroundColor: "rgba(0, 0, 0, 0)",
                                  bottom: "0px",
                                  content: "normal",
                                  left: "0px",
                                  right: "0px",
                                  top: "0px",
                                  transitionBehavior: "normal",
                                  transitionDuration: "0s",
                                  transitionTimingFunction: "ease",
                                  transitionDelay: "0s",
                                  transitionProperty: "all",
                                  zIndex: "auto",
                                  scrollbarWidth: "thin",
                                  borderRadius: "0px",
                                  padding: "1px 0px 1px 0px",
                                }}
                              >
                                <span
                                  style={{
                                    outlineColor: "rgb(22, 100, 255)",
                                    display: "block",
                                    position: "absolute",
                                    backgroundColor: "rgba(0, 0, 0, 0)",
                                    bottom: "0px",
                                    content: '""',
                                    left: "-8px",
                                    right: "-8px",
                                    top: "0px",
                                    transitionBehavior: "normal",
                                    transitionDuration: "0.2s",
                                    transitionTimingFunction: "linear",
                                    transitionDelay: "0s",
                                    transitionProperty: "all",
                                    zIndex: "-1",
                                    scrollbarWidth: "auto",
                                    borderRadius: "4px",
                                    padding: "0px",
                                  }}
                                ></span>
                                MCP 工具集
                              </span>
                            </div>
                            <div
                              style={{
                                outlineColor: "rgb(0, 0, 0)",
                                backgroundColor: "rgb(22, 100, 255)",
                                bottom: "1px",
                                height: "2px",
                                position: "absolute",
                                right: "16.0781px",
                                top: "37px",
                                transitionBehavior: "normal, normal",
                                transitionDuration: "0.2s, 0.2s",
                                transitionTimingFunction:
                                  "cubic-bezier(0.34, 0.69, 0.1, 1), cubic-bezier(0.34, 0.69, 0.1, 1)",
                                transitionDelay: "0s, 0s",
                                transitionProperty: "left, width",
                                left: "93.3962px",
                                width: "76px",
                                borderRadius: "4px 4px 0px 0px",
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ outlineColor: "rgb(0, 0, 0)", marginTop: "16px" }}
                  >
                    <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                      <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                        <div
                          style={{
                            outlineColor: "rgb(0, 0, 0)",
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "16px",
                          }}
                        >
                          <div
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              display: "flex",
                              justifyContent: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(0, 0, 0)",
                                display: "flex",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(0, 0, 0)",
                                  marginRight: "12px",
                                }}
                              >
                                <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                                  <div
                                    style={{
                                      outlineColor: "rgb(0, 0, 0)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div
                                      style={{ outlineColor: "rgb(0, 0, 0)" }}
                                    >
                                      <div
                                        style={{ outlineColor: "rgb(0, 0, 0)" }}
                                      >
                                        <button
                                          type="button"
                                          style={{
                                            outlineColor: "rgb(255, 255, 255)",
                                            backgroundColor: "rgb(86, 82, 255)",
                                            color: "rgb(255, 255, 255)",
                                            boxShadow:
                                              "rgba(0, 0, 0, 0.15) 0px 1px 1px 0px",
                                            border:
                                              "1px solid rgb(23, 89, 221)",
                                            padding: "0px 16px 0px 16px",
                                          }}
                                        >
                                          <span
                                            style={{
                                              outlineColor:
                                                "rgb(255, 255, 255)",
                                              scrollbarWidth: "thin",
                                            }}
                                          >
                                            创建 MCP 工具集
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  outlineColor: "rgb(0, 0, 0)",
                                  marginRight: "0px",
                                }}
                              >
                                <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                                  <div
                                    style={{
                                      outlineColor: "rgb(0, 0, 0)",
                                      alignItems: "center",
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <div
                                      style={{
                                        outlineColor: "rgb(0, 0, 0)",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        width: "236px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          outlineColor: "rgb(0, 0, 0)",
                                          width: "236px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            outlineColor: "rgb(0, 0, 0)",
                                            display: "block",
                                          }}
                                        >
                                          <div
                                            style={{
                                              outlineColor: "rgb(0, 0, 0)",
                                              position: "relative",
                                            }}
                                          >
                                            <div
                                              style={{
                                                outlineColor: "rgb(0, 0, 0)",
                                                alignItems: "center",
                                                backgroundColor:
                                                  "rgb(255, 255, 255)",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                minHeight: "32px",
                                                minWidth: "236px",
                                                position: "relative",
                                                width: "236px",
                                                border:
                                                  "1px solid rgb(221, 226, 233)",
                                                borderRadius: "4px",
                                                padding: "0px 12px 0px 12px",
                                              }}
                                            >
                                              <IconSearch
                                                style={{
                                                  outlineColor:
                                                    "rgb(115, 122, 135)",
                                                  color: "rgb(115, 122, 135)",
                                                  display: "block",
                                                  fontStyle: "normal",
                                                  height: "12px",
                                                  verticalAlign: "-2px",
                                                  width: "12px",
                                                  flexShrink: "0",
                                                }}
                                              />
                                              <input
                                                placeholder="搜索名称、ID"
                                                value=""
                                                style={{
                                                  fontFamily:
                                                    'Roboto, Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif, "Helvetica Neue", -apple-system, "system-ui", "noto sans"',
                                                  lineHeight: "20px",
                                                  overflowX: "clip",
                                                  overflowY: "clip",
                                                  outlineColor:
                                                    "rgb(12, 13, 14)",
                                                  outlineStyle: "none",
                                                  outlineWidth: "3px",
                                                  appearance: "none",
                                                  WebkitTapHighlightColor:
                                                    "rgba(0, 0, 0, 0)",
                                                  backgroundColor:
                                                    "rgb(255, 255, 255)",
                                                  boxSizing: "border-box",
                                                  color: "rgb(12, 13, 14)",
                                                  fontSize: "13px",
                                                  transitionBehavior:
                                                    "normal, normal, normal",
                                                  transitionDuration:
                                                    "0.1s, 0.1s, 0.1s",
                                                  transitionTimingFunction:
                                                    "linear, linear, linear",
                                                  transitionDelay: "0s, 0s, 0s",
                                                  transitionProperty:
                                                    "color, border-color, background-color",
                                                  width: "198px",
                                                  flexGrow: "1",
                                                  flexShrink: "1",
                                                  flexBasis: "auto",
                                                  boxShadow: "none",
                                                  scrollbarColor:
                                                    "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                                  scrollbarWidth: "thin",
                                                  border:
                                                    "0px none rgb(12, 13, 14)",
                                                  borderRadius: "4px",
                                                  padding: "5px 0px 5px 4px",
                                                  margin: "0px",
                                                }}
                                              ></input>
                                            </div>
                                            <span
                                              style={{
                                                outlineColor: "rgb(0, 0, 0)",
                                                position: "absolute",
                                                scrollbarWidth: "auto",
                                              }}
                                            ></span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              display: "flex",
                              justifyContent: "flex-end",
                            }}
                          >
                            <div
                              style={{
                                outlineColor: "rgb(0, 0, 0)",
                                display: "flex",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(0, 0, 0)",
                                  marginRight: "0px",
                                }}
                              >
                                <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                                  <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                                    <div
                                      style={{
                                        outlineColor: "rgb(0, 0, 0)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <div
                                        style={{ outlineColor: "rgb(0, 0, 0)" }}
                                      >
                                        <div
                                          style={{
                                            outlineColor: "rgb(0, 0, 0)",
                                          }}
                                        >
                                          <button
                                            type="button"
                                            style={{
                                              outlineColor: "rgb(66, 70, 78)",
                                              backgroundColor:
                                                "rgb(255, 255, 255)",
                                              color: "rgb(66, 70, 78)",
                                              width: "32px",
                                              boxShadow:
                                                "rgba(0, 0, 0, 0.08) 0px 1px 1px 0px",
                                              border:
                                                "1px solid rgb(221, 226, 233)",
                                              padding: "0px",
                                            }}
                                          >
                                            <IconRefresh
                                              style={{
                                                outlineColor:
                                                  "rgb(78, 89, 105)",
                                                color: "rgb(78, 89, 105)",
                                                display: "inline-block",
                                                fontStyle: "normal",
                                                height: "16px",
                                                stroke: "rgb(78, 89, 105)",
                                                verticalAlign: "middle",
                                                width: "16px",
                                                fill: "none",
                                                fontSize: "16px",
                                              }}
                                            />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          outlineColor: "rgb(0, 0, 0)",
                          display: "inline-block",
                          width: "1232px",
                        }}
                      >
                        <div
                          style={{
                            outlineColor: "rgb(0, 0, 0)",
                            position: "relative",
                          }}
                        >
                          <div style={{ outlineColor: "rgb(0, 0, 0)" }}>
                            <div
                              style={{
                                outlineColor: "rgb(0, 0, 0)",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  outlineColor: "rgb(0, 0, 0)",
                                  display: "block",
                                }}
                              >
                                <div
                                  style={{
                                    outlineColor: "rgb(0, 0, 0)",
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    style={{
                                      outlineColor: "rgb(0, 0, 0)",
                                      position: "relative",
                                      backgroundColor: "rgba(0, 0, 0, 0)",
                                      bottom: "0px",
                                      content: "normal",
                                      height: "255px",
                                      left: "0px",
                                      width: "1231px",
                                      zIndex: "auto",
                                      borderTop: "1px solid rgb(234, 237, 241)",
                                      borderRight:
                                        "1px solid rgb(234, 237, 241)",
                                      borderRadius: "4px 4px 0px 0px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        outlineColor: "rgb(0, 0, 0)",
                                        position: "absolute",
                                        backgroundColor: "rgb(234, 237, 241)",
                                        bottom: "0px",
                                        content: '""',
                                        height: "1px",
                                        left: "0px",
                                        width: "1231px",
                                        zIndex: "2",
                                        scrollbarWidth: "auto",
                                        borderTop: "0px none rgb(0, 0, 0)",
                                        borderRight: "0px none rgb(0, 0, 0)",
                                        borderRadius: "0px",
                                      }}
                                    ></span>
                                    <div
                                      style={{
                                        outlineColor: "rgb(0, 0, 0)",
                                        overflowX: "hidden",
                                        overflowY: "hidden",
                                        width: "1231px",
                                        bottom: "auto",
                                        boxShadow: "none",
                                        content: "normal",
                                        height: "255px",
                                        pointerEvents: "auto",
                                        position: "static",
                                        top: "auto",
                                        transitionBehavior: "normal",
                                        transitionDuration: "0s",
                                        transitionTimingFunction: "ease",
                                        transitionDelay: "0s",
                                        transitionProperty: "all",
                                        zIndex: "auto",
                                        borderTopLeftRadius: "0px",
                                        left: "auto",
                                      }}
                                    >
                                      <span
                                        style={{
                                          outlineColor: "rgb(0, 0, 0)",
                                          overflowX: "visible",
                                          overflowY: "visible",
                                          width: "10px",
                                          bottom: "-1px",
                                          boxShadow: "none",
                                          content: '""',
                                          height: "255px",
                                          pointerEvents: "none",
                                          position: "absolute",
                                          top: "-1px",
                                          transitionBehavior: "normal",
                                          transitionDuration: "0.1s",
                                          transitionTimingFunction: "linear",
                                          transitionDelay: "0s",
                                          transitionProperty: "box-shadow",
                                          zIndex: "1",
                                          borderTopLeftRadius: "4px",
                                          left: "0px",
                                          scrollbarWidth: "auto",
                                        }}
                                      ></span>
                                      <div
                                        style={{
                                          outlineColor: "rgb(0, 0, 0)",
                                          overflowX: "auto",
                                          overflowY: "hidden",
                                          width: "1231px",
                                        }}
                                      >
                                        <table
                                          style={{
                                            outlineColor: "rgb(0, 0, 0)",
                                            outlineStyle: "none",
                                            outlineWidth: "3px",
                                            tableLayout: "fixed",
                                            borderCollapse: "separate",
                                            WebkitBorderHorizontalSpacing:
                                              "0px",
                                            WebkitBorderVerticalSpacing: "0px",
                                            minWidth: "100%",
                                            width: "1231px",
                                            scrollbarColor:
                                              "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                            scrollbarWidth: "thin",
                                            margin: "0px",
                                          }}
                                        >
                                          <colgroup
                                            style={{
                                              outlineColor: "rgb(0, 0, 0)",
                                              outlineStyle: "none",
                                              outlineWidth: "3px",
                                              scrollbarColor:
                                                "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                              scrollbarWidth: "thin",
                                            }}
                                          >
                                            <col
                                              style={{ width: "196.539px" }}
                                            ></col>
                                            <col
                                              style={{ width: "124.133px" }}
                                            ></col>
                                            <col
                                              style={{ width: "124.133px" }}
                                            ></col>
                                            <col
                                              style={{ width: "113.789px" }}
                                            ></col>
                                            <col
                                              style={{ width: "134.477px" }}
                                            ></col>
                                            <col
                                              style={{ width: "124.133px" }}
                                            ></col>
                                            <col
                                              style={{ width: "124.133px" }}
                                            ></col>
                                            <col
                                              style={{ width: "165.508px" }}
                                            ></col>
                                            <col
                                              style={{ width: "124.156px" }}
                                            ></col>
                                          </colgroup>
                                          <thead
                                            style={{
                                              outlineColor: "rgb(0, 0, 0)",
                                              outlineStyle: "none",
                                              outlineWidth: "3px",
                                              scrollbarColor:
                                                "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                              scrollbarWidth: "thin",
                                            }}
                                          >
                                            <tr style={{}}>
                                              <th
                                                style={{
                                                  position: "sticky",
                                                  zIndex: "1",
                                                  left: "0px",
                                                  borderLeft:
                                                    "1px solid rgb(234, 237, 241)",
                                                  borderRadius:
                                                    "4px 0px 0px 0px",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    padding:
                                                      "10px 16px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    名称 / ID
                                                  </span>
                                                </div>
                                                <span
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    fontSize: "12px",
                                                    backgroundColor:
                                                      "rgba(0, 0, 0, 0)",
                                                    boxSizing: "content-box",
                                                    color: "rgb(66, 70, 78)",
                                                    fontWeight: "500",
                                                    lineHeight: "18.4615px",
                                                    textAlign: "left",
                                                    position: "absolute",
                                                    zIndex: "auto",
                                                    scrollbarWidth: "auto",
                                                    left: "185.539px",
                                                    borderLeft:
                                                      "0px none rgb(66, 70, 78)",
                                                    borderBottom:
                                                      "0px none rgb(66, 70, 78)",
                                                    borderRadius: "0px",
                                                    padding: "0px",
                                                    margin: "0px",
                                                  }}
                                                ></span>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    alignItems: "center",
                                                    display: "flex",
                                                    padding:
                                                      "10px 28px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    状态
                                                  </span>
                                                  <div
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      alignItems: "center",
                                                      backgroundColor:
                                                        "rgba(0, 0, 0, 0)",
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      height: "22px",
                                                      justifyContent: "center",
                                                      lineHeight: "12px",
                                                      position: "static",
                                                      right: "0px",
                                                      top: "0px",
                                                      transitionBehavior:
                                                        "normal",
                                                      transitionDuration:
                                                        "0.1s",
                                                      transitionTimingFunction:
                                                        "linear",
                                                      transitionDelay: "0s",
                                                      transitionProperty: "all",
                                                      verticalAlign: "0px",
                                                      width: "22px",
                                                      marginLeft: "4px",
                                                      borderRadius: "2px",
                                                    }}
                                                  >
                                                    <IconFilterStatus
                                                      style={{
                                                        outlineColor:
                                                          "rgb(66, 70, 78)",
                                                        color:
                                                          "rgb(66, 70, 78)",
                                                        display: "block",
                                                        fontStyle: "normal",
                                                        height: "12px",
                                                        stroke:
                                                          "rgb(66, 70, 78)",
                                                        verticalAlign: "-2px",
                                                        width: "12px",
                                                        fill: "none",
                                                        fontSize: "12px",
                                                        transitionBehavior:
                                                          "normal",
                                                        transitionDuration:
                                                          "0.1s",
                                                        transitionTimingFunction:
                                                          "linear",
                                                        transitionDelay: "0s",
                                                        transitionProperty:
                                                          "all",
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    alignItems: "center",
                                                    display: "flex",
                                                    padding:
                                                      "10px 28px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    网络配置
                                                  </span>
                                                  <div
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      alignItems: "center",
                                                      backgroundColor:
                                                        "rgba(0, 0, 0, 0)",
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      height: "22px",
                                                      justifyContent: "center",
                                                      lineHeight: "12px",
                                                      position: "static",
                                                      right: "0px",
                                                      top: "0px",
                                                      transitionBehavior:
                                                        "normal",
                                                      transitionDuration:
                                                        "0.1s",
                                                      transitionTimingFunction:
                                                        "linear",
                                                      transitionDelay: "0s",
                                                      transitionProperty: "all",
                                                      verticalAlign: "0px",
                                                      width: "22px",
                                                      marginLeft: "4px",
                                                      borderRadius: "2px",
                                                    }}
                                                  >
                                                    <IconFilterNetwork
                                                      style={{
                                                        outlineColor:
                                                          "rgb(66, 70, 78)",
                                                        color:
                                                          "rgb(66, 70, 78)",
                                                        display: "block",
                                                        fontStyle: "normal",
                                                        height: "12px",
                                                        stroke:
                                                          "rgb(66, 70, 78)",
                                                        verticalAlign: "-2px",
                                                        width: "12px",
                                                        fill: "none",
                                                        fontSize: "12px",
                                                        transitionBehavior:
                                                          "normal",
                                                        transitionDuration:
                                                          "0.1s",
                                                        transitionTimingFunction:
                                                          "linear",
                                                        transitionDelay: "0s",
                                                        transitionProperty:
                                                          "all",
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    padding:
                                                      "10px 16px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    入站认证
                                                  </span>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    alignItems: "center",
                                                    display: "flex",
                                                    padding:
                                                      "10px 28px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    调用模式
                                                  </span>
                                                  <div
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      alignItems: "center",
                                                      backgroundColor:
                                                        "rgba(0, 0, 0, 0)",
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      height: "22px",
                                                      justifyContent: "center",
                                                      lineHeight: "12px",
                                                      position: "static",
                                                      right: "0px",
                                                      top: "0px",
                                                      transitionBehavior:
                                                        "normal",
                                                      transitionDuration:
                                                        "0.1s",
                                                      transitionTimingFunction:
                                                        "linear",
                                                      transitionDelay: "0s",
                                                      transitionProperty: "all",
                                                      verticalAlign: "0px",
                                                      width: "22px",
                                                      marginLeft: "4px",
                                                      borderRadius: "2px",
                                                    }}
                                                  >
                                                    <IconFilterCallMode
                                                      style={{
                                                        outlineColor:
                                                          "rgb(66, 70, 78)",
                                                        color:
                                                          "rgb(66, 70, 78)",
                                                        display: "block",
                                                        fontStyle: "normal",
                                                        height: "12px",
                                                        stroke:
                                                          "rgb(66, 70, 78)",
                                                        verticalAlign: "-2px",
                                                        width: "12px",
                                                        fill: "none",
                                                        fontSize: "12px",
                                                        transitionBehavior:
                                                          "normal",
                                                        transitionDuration:
                                                          "0.1s",
                                                        transitionTimingFunction:
                                                          "linear",
                                                        transitionDelay: "0s",
                                                        transitionProperty:
                                                          "all",
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    alignItems: "center",
                                                    display: "flex",
                                                    padding:
                                                      "10px 28px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    网关模式
                                                  </span>
                                                  <div
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      alignItems: "center",
                                                      backgroundColor:
                                                        "rgba(0, 0, 0, 0)",
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      height: "22px",
                                                      justifyContent: "center",
                                                      lineHeight: "12px",
                                                      position: "static",
                                                      right: "0px",
                                                      top: "0px",
                                                      transitionBehavior:
                                                        "normal",
                                                      transitionDuration:
                                                        "0.1s",
                                                      transitionTimingFunction:
                                                        "linear",
                                                      transitionDelay: "0s",
                                                      transitionProperty: "all",
                                                      verticalAlign: "0px",
                                                      width: "22px",
                                                      marginLeft: "4px",
                                                      borderRadius: "2px",
                                                    }}
                                                  >
                                                    <IconFilterGatewayMode
                                                      style={{
                                                        outlineColor:
                                                          "rgb(66, 70, 78)",
                                                        color:
                                                          "rgb(66, 70, 78)",
                                                        display: "block",
                                                        fontStyle: "normal",
                                                        height: "12px",
                                                        stroke:
                                                          "rgb(66, 70, 78)",
                                                        verticalAlign: "-2px",
                                                        width: "12px",
                                                        fill: "none",
                                                        fontSize: "12px",
                                                        transitionBehavior:
                                                          "normal",
                                                        transitionDuration:
                                                          "0.1s",
                                                        transitionTimingFunction:
                                                          "linear",
                                                        transitionDelay: "0s",
                                                        transitionProperty:
                                                          "all",
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    padding:
                                                      "10px 16px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    标签
                                                  </span>
                                                </div>
                                              </th>
                                              <th style={{}}>
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    padding:
                                                      "10px 16px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    创建时间
                                                  </span>
                                                </div>
                                              </th>
                                              <th
                                                style={{
                                                  position: "sticky",
                                                  zIndex: "1",
                                                  right: "0px",
                                                  borderRadius:
                                                    "0px 4px 0px 0px",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    position: "relative",
                                                    transitionBehavior:
                                                      "normal",
                                                    transitionDuration: "0.1s",
                                                    transitionTimingFunction:
                                                      "linear",
                                                    transitionDelay: "0s",
                                                    transitionProperty:
                                                      "background-color",
                                                    padding:
                                                      "10px 16px 10px 16px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      outlineColor:
                                                        "rgb(66, 70, 78)",
                                                      scrollbarWidth: "thin",
                                                    }}
                                                  >
                                                    操作
                                                  </span>
                                                </div>
                                                <span
                                                  style={{
                                                    outlineColor:
                                                      "rgb(66, 70, 78)",
                                                    fontSize: "12px",
                                                    backgroundColor:
                                                      "rgba(0, 0, 0, 0)",
                                                    boxSizing: "content-box",
                                                    color: "rgb(66, 70, 78)",
                                                    fontWeight: "500",
                                                    lineHeight: "18.4615px",
                                                    textAlign: "left",
                                                    position: "absolute",
                                                    zIndex: "auto",
                                                    scrollbarWidth: "auto",
                                                    right: "114.156px",
                                                    borderBottom:
                                                      "0px none rgb(66, 70, 78)",
                                                    borderRadius: "0px",
                                                    padding: "0px",
                                                    margin: "0px",
                                                  }}
                                                ></span>
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody
                                            style={{
                                              outlineColor: "rgb(0, 0, 0)",
                                              outlineStyle: "none",
                                              outlineWidth: "3px",
                                              scrollbarColor:
                                                "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                              scrollbarWidth: "thin",
                                            }}
                                          >
                                            <tr style={{}}>
                                              <td
                                                colspan="9"
                                                style={{
                                                  outlineColor:
                                                    "rgb(12, 13, 14)",
                                                  outlineStyle: "none",
                                                  outlineWidth: "3px",
                                                  fontSize: "12px",
                                                  backgroundColor:
                                                    "rgb(255, 255, 255)",
                                                  boxSizing: "border-box",
                                                  color: "rgb(12, 13, 14)",
                                                  lineHeight: "18.4615px",
                                                  textAlign: "left",
                                                  scrollbarColor:
                                                    "rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0)",
                                                  scrollbarWidth: "thin",
                                                  borderLeft:
                                                    "0px none rgb(12, 13, 14)",
                                                  borderBottom:
                                                    "0px none rgb(12, 13, 14)",
                                                  padding:
                                                    "10px 16px 10px 16px",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    outlineColor:
                                                      "rgb(12, 13, 14)",
                                                    boxSizing: "border-box",
                                                    left: "0px",
                                                    position: "sticky",
                                                    fontSize: "14px",
                                                    lineHeight: "40px",
                                                    textAlign: "center",
                                                    width: "1231px",
                                                    borderLeft:
                                                      "1px solid rgb(234, 237, 241)",
                                                    padding: "20px",
                                                    margin:
                                                      "-10px -17px -10px -17px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      outlineColor:
                                                        "rgb(12, 13, 14)",
                                                      boxSizing: "border-box",
                                                      width: "1190px",
                                                      padding:
                                                        "12px 0px 28px 0px",
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        outlineColor:
                                                          "rgb(169, 174, 184)",
                                                        boxSizing: "border-box",
                                                        color:
                                                          "rgb(169, 174, 184)",
                                                        width: "1190px",
                                                      }}
                                                    >
                                                      <div
                                                        style={{
                                                          outlineColor:
                                                            "rgb(169, 174, 184)",
                                                          fontSize: "60px",
                                                          lineHeight: "60px",
                                                          marginBottom: "12px",
                                                          alignItems: "center",
                                                          display: "flex",
                                                          justifyContent:
                                                            "center",
                                                        }}
                                                      >
                                                        <IconEmptyState
                                                          style={{
                                                            outlineColor:
                                                              "rgb(169, 174, 184)",
                                                          }}
                                                        />
                                                      </div>
                                                      <div
                                                        style={{
                                                          outlineColor:
                                                            "rgb(115, 122, 135)",
                                                          color:
                                                            "rgb(115, 122, 135)",
                                                          fontSize: "13px",
                                                        }}
                                                      >
                                                        暂无 MCP 工具集
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                      <span
                                        style={{
                                          outlineColor: "rgb(0, 0, 0)",
                                          overflowX: "visible",
                                          overflowY: "visible",
                                          width: "10px",
                                          bottom: "-1px",
                                          boxShadow: "none",
                                          content: '""',
                                          height: "255px",
                                          pointerEvents: "none",
                                          position: "absolute",
                                          top: "-1px",
                                          transitionBehavior: "normal",
                                          transitionDuration: "0.1s",
                                          transitionTimingFunction: "linear",
                                          transitionDelay: "0s",
                                          transitionProperty: "box-shadow",
                                          zIndex: "1",
                                          borderTopLeftRadius: "0px",
                                          left: "1221px",
                                          scrollbarWidth: "auto",
                                        }}
                                      ></span>
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      outlineColor: "rgb(0, 0, 0)",
                                      position: "absolute",
                                      scrollbarWidth: "auto",
                                    }}
                                  ></span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              outlineColor: "rgb(0, 0, 0)",
                              position: "absolute",
                              scrollbarWidth: "auto",
                            }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </section>
            </main>
          </section>
        </div>

        <div id="vcopilot" style={{ outlineColor: "rgb(0, 0, 0)" }}>
          <iframe src="about:blank" style={{}}></iframe>
          <div
            id="garfish_app_for_vcopilot_aosjhi1z"
            style={{ outlineColor: "rgb(0, 0, 0)" }}
          ></div>
        </div>
      </div>
    </>
  );
}

render(<Component />, document.getElementById("root"));
