'use babel';

import CleanCanvasDheerajView from './clean-canvas-dheeraj-view';
import { CompositeDisposable } from 'atom';

export default {

  cleanCanvasDheerajView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.cleanCanvasDheerajView = new CleanCanvasDheerajView(state.cleanCanvasDheerajViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.cleanCanvasDheerajView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'clean-canvas-dheeraj:cleanHtml': () => this.cleanHtml()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.cleanCanvasDheerajView.destroy();
  },

  serialize() {
    return {
      cleanCanvasDheerajViewState: this.cleanCanvasDheerajView.serialize()
    };
  },

  // converts a string formated HTML code into chunks of html element and returns an array of format [totalElement, endTag or startTag, start index of element, name of the element]
  // sample example
            // htmlCode:
            //     <!DOCTYPE html>
            //     <html lang="en">
            //       <head>
            //         <meta charset="UTF-8">
            //         <title>Title</title>
            //         <script src="https://d3js.org/d3.v7.min.js"></script>
            //       </head>
            //     </html>
  //
  // getHtmlElement(0, htmlCode) returns [<!DOCTYPE html>, "startTag", 0, "DOCTYPE"]
  // getHtmlElement(17, htmlCode) returns [<html lang="en">, "startTag", 17, "html"]
  // getHtmlElement(36, htmlCode) returns [<head>, "startTag", 36, "head"]
  // getHtmlElement(92, htmlCode) returns [</head>, "endTag", 92, "head"]

  getHtmlElement(start, htmlCode) {
    var elementName = "";
    var flag = true;
    var totalElement = "";
    while(start < htmlCode.length){
      if(htmlCode[start] === ` ` && flag){
        elementName = totalElement.slice() + ">";
        flag = false;
      }

      totalElement += htmlCode[start]
      if(htmlCode[start] === `>`){
        if(totalElement === "</html>"){
          break;
        }

        if(flag){
            elementName = totalElement.slice();
        }

        start += 1;

        break;
      }
      start += 1;
    }

    return [totalElement, elementName[1] === "/" ? "endTag" : "startTag", start, elementName]
  },

  //clean html removes P tag using stack datastructure
  
  cleanHtml() {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      let htmlCode = editor.getSelectedText();
      var i = 0;
      var table_listDic = {};
      var stack = [];

      while(i < htmlCode.length){

        if(htmlCode[i] === "<"){
          var parsedHtmlElement = this.getHtmlElement(i, htmlCode);
          stack.push(parsedHtmlElement);
          i = parsedHtmlElement[2];

          if(parsedHtmlElement[3] === "<table>" || parsedHtmlElement[3] === "<ul>" || parsedHtmlElement[3] === "<ol>"){
            if(parsedHtmlElement[3] in table_listDic){
              table_listDic[parsedHtmlElement[3]] += 1;
            }
            else{
              table_listDic[parsedHtmlElement[3]] = 1;
            }
          }

          if(parsedHtmlElement[3] === "</p>" && ((table_listDic["<table>"] >= 1) || (table_listDic["<ul>"] >= 1) || (table_listDic["<ol>"] >= 1))){
            var idx = stack.length - 1;
            while(idx >= 0 ){
              if(stack[idx][3] === "<p>"){
                stack[idx] = -1;
                stack.pop();
                break;
              }
              idx--;
            }
          }

          if(parsedHtmlElement[3] === "</table>" || parsedHtmlElement[3] === "</ul>" || parsedHtmlElement[3] === "</ol>"){
            if(table_listDic[parsedHtmlElement[3]] > 1){
              table_listDic[parsedHtmlElement[3]] -= 1;
            }
            else{
              delete table_listDic[parsedHtmlElement[3]];
            }
          }

        }

        else{
          var tempString = "";
          while(i < htmlCode.length){
            if(htmlCode[i] === "<"){
              stack.push([tempString, "text", i, ""])
              break;
            }
            tempString += htmlCode[i];
            i += 1
          }
        }
      }

      var resultHtmlCode = "";
      for(var idx = 0; idx < stack.length; idx++){
        if(stack[idx] === -1){
          continue;
        }
        resultHtmlCode += stack[idx][0];
      }

      editor.insertText(resultHtmlCode);
    }
  }

};
