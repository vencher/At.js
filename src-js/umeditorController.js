var UmeditorController,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

UmeditorController = (function(superClass) {
  extend(UmeditorController, superClass);

    // 获取同一个节点前面所有节点的内容
    function getPrevElemsContent(elem) {
        var $elem = $(elem);
        var preText = [];
        var isBreak = false;
        while($elem.prev().length>0) {
            var $prevNode = $elem.prev();
            if($prevNode.is('br')) {
                isBreak = true;
                break;
            }
            preText.push($prevNode.text());
            $elem = $prevNode;
        }
        return {
            isBreak: false,
            preText: preText.join('')
        };
    }

  function UmeditorController() {
    var instance = UmeditorController.__super__.constructor.apply(this, arguments);
    this.um = this.$inputor[0];
    this.listen();

    this.view.$el.css('z-index', this.um.getOpt('zIndex') + 1);

    return instance;
  }

  UmeditorController.prototype.catchQuery = function() {

    // 获取光标位置
    var caretObj = um.selection.getRange();
    var endElem = caretObj.endContainer;
    var endOffset = caretObj.endOffset;

    // 截取内容
    var $elem = $(endElem);
    var subtext = $elem.text().substring(0, endOffset);
    var $parentElem = $elem;
    var maxDepth = 20;
    // 遇到换行标签p，或者遇到body容器，最大20层
    while($parentElem.length > 0
    && !$parentElem.is('p') && this.um.$body[0] !== $parentElem[0]
    && maxDepth > 0) {
      preContent = getPrevElemsContent($elem);
      subtext = preContent.preText + subtext;
      if(preContent.isBreak) {
          break;
      }
      $parentElem = $parentElem.parent();
      maxDepth --;
    }

    var query = this.callbacks("matcher").call(this, this.at, subtext, this.getOpt('startWithSpace'), this.getOpt("acceptSpaceBar"));
    var isString = typeof query === 'string';
    if (isString && query.length < this.getOpt('minLen', 0)) {
      return;
    }
    if (isString && query.length <= this.getOpt('maxLen', 20)) {
      var matchLength = query.length;
      query = {
          'text': query,
          'container': caretObj.endContainer,
          'endOffset': caretObj.endOffset,
          'matchLength': matchLength
      };
      this.trigger("matched", [this.at, query.text]);
    } else {
      query = null;
      this.view.hide();
    }
    return this.query = query;
  };

  UmeditorController.prototype.rect = function() {
      var query = this.query;
      if(!query)
          return {};

      var container = query.container, endOffset = query.endOffset;
      var $elem = $(container);
      // 获取标签的长度
      var subtext = $elem.text().substring(0, endOffset);
      // 如果是text
      if('#text' === container.nodeName) {
          $elem = $elem.parent();
      }
      // 计算定位
      var offset, width, height;
      var $cloneElem = $elem.clone();
      $cloneElem.hide().css('float', 'left').text(subtext).prependTo($elem);
      offset = $elem.offset(), width = $cloneElem.width(), height =$cloneElem.height();
      $cloneElem.remove();

      var scaleBottom = this.app.document.selection ? 0 : 2;
      return {
          left: offset.left + width,
          top: offset.top + height,
          bottom: offset.top + height + scaleBottom
      };
  };

  UmeditorController.prototype.insert = function(content, $li) {
      var container = this.query.container;
      var $container = $(container);
      var source = $container.text();
      var startStr = source.slice(0, this.query.endOffset - this.query.matchLength - this.at.length);

      var suffix = (suffix = this.getOpt('suffix')) === "" ? suffix : suffix || " ";
      var text = "" + startStr + content + suffix + (source.slice(this.query.endOffset || 0));
      if('#text' === container.nodeName) {
          container.nodeValue = text;
      }else{
          $container.text(text);
      }

      // 聚焦
      this.um.selection.getRange()
          .setStart(container, this.query.endOffset + content.length - this.query.matchLength - this.at.length)
          .setCursor(!1, !0);

      // 触发change事件
      this.um.fireEvent("contentchange");
  };

    /**
     * app的listen不适用于umeditor，要中转一层
     */
    UmeditorController.prototype.listen = function() {

        var events = [
            'keyup',
            'keydown',
            'blur',
            'click'
        ];
        for(var i=0; i<events.length; i++) {
            this.um.addListener(events[i], function (eventKey, event) {
                if(eventKey === 'blur' || eventKey === 'focus') {
                    // 不触发um的属性方法
                    event.preventDefault();
                    $(this).trigger(event);
                }else{
                    $(this).trigger(event);
                }
            });
        }
        var _this = this;
        this.um.addListener('ready', function() {
            _this.um.$body.on('scroll', function() {
                $(_this.um).trigger('scroll');
            });
        });

        this.um.addListener('beforeenterkeydown', function(eventKey, event) {
            return !!_this.expectedQueryCBId;
        });
    };

  return UmeditorController;

})(Controller);

App.addController('umeditor', UmeditorController);