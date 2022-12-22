/**
 * Created by ian on 2015. 5. 22..
 */

var $initErrors;
var $types;
var $emptyQuestion;
var $returnUpload;

var $diffWithStandard;
var $setSaved;
var $renderSavedAt;

var $modalCropImage;

var $customForeColorPicked = [];
var $customBackColorPicked = [];

$(function () {
    $diffWithStandard = $currentStandard - new Date().getTime();
    var savedAt = $('.container-saved-at');
    $setSaved = function (time) {
        savedAt.data('time', time);
        $renderSavedAt();
    };
    $renderSavedAt = function () {
        var saved = moment(savedAt.data('time'));
        savedAt.empty().append($messages['label.autosaved'] + '&nbsp;&nbsp;').append(saved.format('MM.DD[&nbsp;&nbsp;]HH:mm'))
    };

    $setSaved($initSavedAt);

    var elDoc = $(document).click(function (e) {
        var target = $(e.target);
        var qActive = $('.q-active');
        var deferred = function () {
            busyService.start(true);
            $.proxy(deactivate, null, qActive)();
        };
        if (!target.hasClass('backdrop') &&
            target.closest('.q-container, .q-controls').length === 0
            && target.closest('#container-questions').length && qActive.length
            && !target.hasClass('error-item')
            && !target.hasClass('error-text-highlight')) {
            if ($('.to-be-saved').length) {
                save(function() {
                    deferred();
                    refreshSidebar();
                });
            } else {
                deferred();
            }
        }
    }).on('keydown', function (e) {
        if (e.which == 9 && lockService.isLock) {
            e.preventDefault();
        }
    });
    var elWin = $(window).on({
        focus: function () {
            $renderSavedAt();
        },
        beforeunload: function (e) {
            var shouldConfirm = false;
            var confirmationMessage = '아직 저장되지 않은 수정사항이 있습니다.';
            var saveList = $('.to-be-saved');
            var batchEntryConditions = !!batchListQuestion.data('timeout');
            if (saveList.length || batchEntryConditions) {
                shouldConfirm = true;
                if (saveList.length) {
                    save();
                }
                if (batchEntryConditions) {
                    onChangeTextarea();
                }
            }

            if (surveyTitle.hasClass('to-be-saved-for-survey')) {
                shouldConfirm = true;
                setTimeout($.proxy(saveSurvey, surveyTitle), 0);
            }
            if (surveyDescription.hasClass('to-be-saved-for-survey')) {
                shouldConfirm = true;
                setTimeout($.proxy(saveSurvey, surveyDescription, true), 0);
            }

            if (shouldConfirm) {
                (e || window.event).returnValue = confirmationMessage;     // Gecko and Trident
                return confirmationMessage;                                // Gecko and WebKit
            }
        }
    }).on('resize scroll', function () {
        clearTimeout(elWin.data('timeout'));
        elWin.data('timeout', setTimeout(function () {
            if (tinymce.activeEditor) {
                var editor = $(tinymce.activeEditor.bodyElement);
                var offset = {top: editor.offset().top, left: containerQ.offset().left + (containerQuestions.hasClass('new-survey') ? -3 : 52)};
                var scrollTop = elWin.scrollTop();
                var heightWindow = elWin.height();

                if (floatingToolbar.hasClass('change-format')) {
                    floatingToolbar.css({
                        right: 'auto',
                        left: editor.offset().left - floatingToolbar.outerWidth() - 10,
                        bottom: 'auto',
                        top: offset.top - scrollTop
                    });
                } else {
                    floatingGoto.removeClass('hidden-top hidden-bottom');
                    if (scrollTop > (offset.top + editor.height() - 150)) {
                        floatingGoto.addClass('hidden-top');
                    } else if ((scrollTop + heightWindow) < offset.top) {
                        floatingGoto.addClass('hidden-bottom');
                    }

                    if (floatingToolbar.hasClass('right')) {
                        offset.left += containerQ.width() - 100;
                        floatingToolbar.css({right: 'auto'});
                    } else {
                        offset.right = elWin.width() - offset.left + elWin.scrollLeft() + 5;
                    }

                    if (heightWindow > (offset.top + floatingToolbar.height() - scrollTop)) {
                        if (offset.top - scrollTop < 150) {
                            offset.top = 150 + scrollTop;
                        }

                        floatingToolbar.offset(offset).css({bottom: 'auto'});
                    } else {
                        floatingToolbar.css({top: 'auto', bottom: 0, left: offset.left + 'px'});
                    }

                    if (!floatingToolbar.hasClass('right')) {
                        floatingToolbar.css({left: 'auto', right: offset.right});
                    }
                }
            } else {
                floatingToolbar.offset({top: 0, left: 0}).css({bottom: 'auto'});
            }
        }, 100));
    });

    $('.nav-top > .col-sm-6 > a.tab2').addClass('active').click(function (e) {
        e.preventDefault();
    });

    $('.project-setting').addClass('completely-hide');
    $('#sidebar-calculator-button').addClass('completely-hide');

    var wholeScroller = $('html, body');
    var leftSidebar = $('#left-sidebar-tile');
    var leftListSidebar = $('#left-sidebar-list')
    var floatingToolbar = $('#floating-toolbar').find('.btn').mousedown(function (e) {
        var self = $(this);

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (self.hasClass('goto')) {
            wholeScroller.animate(
                {scrollTop: $(tinymce.activeEditor.bodyElement).offset().top - (elWin.height() / 2)},
                {duration: 300, easing: 'easeOutQuart'}
            );
        } else if (self.hasClass('left-right')) {
            floatingToolbar.toggleClass('right');
            elWin.trigger('scroll');
        } else if (self.hasClass('visible')) {
            floatingToolbar.toggleClass('hidden-mce-only');
            self.find('.fa').toggleClass('fa-eye fa-eye-slash');
        }
    }).end();
    var floatingGoto = $('.goto .fa', floatingToolbar);
    var elHtml = $('html').on('transitionend webkitTransitionEnd msTransitionEnd oTransitionEnd', function (e) {});
    var wholeScroll = false && typeof document.body.style.transitionProperty === 'string'
        ? function (target, delay) {
            setTimeout($.proxy(function () {
                var scrollTopToBottom = elDoc.height() - elWin.height();
                var thisOffsetTop = this.offset().top - 60;
                if (thisOffsetTop > scrollTopToBottom) {
                    thisOffsetTop = scrollTopToBottom;
                }

                elHtml.data('transitioning', thisOffsetTop).css({
                    'margin-top': (elWin.scrollTop() - thisOffsetTop) + 'px',
                    transition: '300ms cubic-bezier(0.165, 0.84, 0.44, 1)'
                });
            }, target), delay ? delay : 0);
        }
        : function (target, delay) {
            setTimeout($.proxy(function () {
                var scrollTopToBottom = elDoc.height() - elWin.height();
                var thisOffsetTop = this.offset().top - 150;
                wholeScroller.animate(
                    {scrollTop: thisOffsetTop > scrollTopToBottom ? scrollTopToBottom : thisOffsetTop},
                    {duration: 300, easing: 'easeOutQuart'}
                );
            }, target), delay ? delay : 0);
        };

    var defaultTinymceOptions = {
        inline: true, menubar: false, skin: 'opensurvey', language: $locale == 'en' ? 'en' : 'ko_OPENSURVEY', schema: 'html5',
        forced_root_block_attrs: {class: 'fr-tag'}, fixed_toolbar_container: '#floating-toolbar',
        toolbar: ['bold italic underline fontsizeselect', 'alignleft aligncenter alignright alignjustify bullist'
            , 'forecolor backcolor undo redo', 'numlist indent outdent link styledelement'
            , 'removeformat2 hr imagecropped movie table'],
        plugins: 'textcolor colorpicker table hr link paste styledelement removeformat2' + ($ws.principal.admin ? ' movie' : ''),
        style_formats_merge: true,
        textcolor_cols: 10, textcolor_rows: 5,
        textcolor_map: [
            '8B1416', '', '673919', '', '735C23', '', '4B511D', '', '244826', '', '29496A', '', '053269', '', '44255C', '', '82053C', '', '000000', '',
            'FF2A20', '', 'FF9B28', '', 'FDD41B', '', '75B52C', '', '00A453', '', '00AFEE', '', '1446BE', '', '961E8C', '', 'FF268A', '', '434343', '',
            'FFC1AF', '', 'FFD4A8', '', 'FFF59B', '', 'C4DD9E', '', '6FC89E', '', '67DDFF', '', '8CA0DC', '', 'C18EBE', '', 'FFB1CD', '', '636363', '',
            'FFE6DF', '', 'FFEEDC', '', 'FFFBD7', '', 'E7F1D8', '', 'C5E9D8', '', 'C2F1FF', '', 'C6E8FF', '', 'E6D2E5', '', 'FFE0EB', '', 'FFFFFF', ''],
        default_link_target: '_blank',
        table_default_styles: {width: '100%'}, table_default_attributes: {class: 'fr-tag'}, table_toolbar: '',
        table_appearance_options: false, paste_filter_drop: false,
        paste_word_valid_elements: 'b,strong,i,em,p,h1,h2,h3,h4,h5,h6,span,br,table,thead,tbody,tfoot,tr,td,style',
        paste_preprocess: function (plugin, args) {
            // 에디터에서 text만 복사하는 경우 h4.fr-tag로 wrapping됨
            var filteredContent = '';
            $('<div>' + args.content + '</div>').contents().each(function() {
                var $this = $(this);
                filteredContent += this instanceof Text ? this.textContent : removeIdAndClass(this.outerHTML);
            });
            args.content = filteredContent;
        },
        paste_postprocess: function (plugin, args) {
            $(args.node).children('h4, p').andSelf().addClass('fr-tag');
        }
    };
    var defaultTinymceOptionsToChangeFormat = {
        inline: true, menubar: false, skin: 'opensurvey', language: $locale == 'en' ? 'en' : 'ko_OPENSURVEY', schema: 'html5',
        forced_root_block_attrs: {class: 'fr-tag'}, fixed_toolbar_container: '#floating-toolbar',
        toolbar: ['bold italic underline fontsizeselect', 'forecolor backcolor undo redo removeformat2'],
        plugins: 'textcolor colorpicker paste removeformat2',
        style_formats_merge: true,
        textcolor_cols: 10, textcolor_rows: 5,
        textcolor_map: [
            '8B1416', '', '673919', '', '735C23', '', '4B511D', '', '244826', '', '29496A', '', '053269', '', '44255C', '', '82053C', '', '000000', '',
            'FF2A20', '', 'FF9B28', '', 'FDD41B', '', '75B52C', '', '00A453', '', '00AFEE', '', '1446BE', '', '961E8C', '', 'FF268A', '', '434343', '',
            'FFC1AF', '', 'FFD4A8', '', 'FFF59B', '', 'C4DD9E', '', '6FC89E', '', '67DDFF', '', '8CA0DC', '', 'C18EBE', '', 'FFB1CD', '', '636363', '',
            'FFE6DF', '', 'FFEEDC', '', 'FFFBD7', '', 'E7F1D8', '', 'C5E9D8', '', 'C2F1FF', '', 'C6E8FF', '', 'E6D2E5', '', 'FFE0EB', '', 'FFFFFF', ''],
        default_link_target: '_blank',
        table_default_styles: {width: '100%'}, table_default_attributes: {class: 'fr-tag'}, table_toolbar: '',
        table_appearance_options: false, paste_filter_drop: false,
        paste_word_valid_elements: 'b,strong,i,em,p,span',
        paste_preprocess: function (plugin, args) {
            // 에디터에서 text만 복사하는 경우 h4.fr-tag로 wrapping됨
            var filteredContent = '';
            $('<div>' + args.content + '</div>').contents().each(function() {
                var $this = $(this);
                filteredContent += this instanceof Text ? this.textContent : removeIdAndClass(this.outerHTML);
            });
            args.content = filteredContent;
        },
        paste_postprocess: function (plugin, args) {
            $(args.node).children('h4, p').replaceWith('<p class="fr-tag">' + $(args.node).children('h4, p').html() + '</p>');
        }
    };
    var removeIdAndClass = function (html) {
        var wrap = $('<div>' + html + '</div>');
        wrap.find('*').removeClass(function (idx, c) {
            return (c.match(/(^|\s)froala-\S+|(^|\s)tinymce-\S+|(^|\s)q-\S+/g) || []).join(' ');
        });
        return wrap.html();
    };
    var onInitEditable = function (initParams, errMsg) {
        var body = $(initParams.editor.bodyElement);
        var currentContent = getRichContent(body);
        $('<small/>').addClass('help-block').insertAfter(body).append(errMsg);
        body.data({previousContent: currentContent, persistent: currentContent});

        busyService.end(body.closest('.q-container'));
    };
    var defaultNumericOptions = {negative: false, decimal: false};

    var modal_formattedOptions = $('#modal-formatted-options');
    var formattedOptions = $('[name=formattedOptions]');
    formattedOptions.on('input propertychange', function () {
        placeholder_formattedOptions[formattedOptions.val() ? 'hide' : 'show']();
        submit_formattedOptions.prop('disabled', getFormattedOptions().length == 0);
    });
    formattedOptions.closest('form').submit(function (e) {
        var arr = getFormattedOptions();
        e.preventDefault();

        if (arr.length) {
            var qContainer1 = $('.q-active .q-container');
            var container = $('.options', qContainer1);
            var isHtmlOption = $('[name=isHtmlOption]', qContainer1).prop('checked');
            if (!isHtmlOption) {
                $('.normal', container).remove();
            }

            var options = container.children();
            var input = $('[contenteditable]', options);
            if (options.length == 1 && input.length
                && !$('.image-container', options).length && !getRichContent(input)) {
                var afterOption = $('[name=afterOption]', options);
                if (!afterOption.parent().is(':visible') || !parseInt(afterOption.val(), 10)) {
                    try {
                        input.tinymce().destroy();
                    } catch (e) {
                    }
                    options.remove();
                }
            }

            var etc = $('.etc', container);
            var etcExist = etc.length > 0;
            var etcAction = null;

            var exclusive = $('.exclusive', container);
            var exclusiveExist = exclusive.length > 0;
            var exclusiveAction = null;

            if (arr[arr.length - 1] == $messages['placeholder.other'] && (!isHtmlOption || !etcExist)) {
                arr.splice(arr.length - 1, 1);
                etcAction = 'check';
            }
            else if (arr[arr.length - 1] != $messages['placeholder.other'] && !isHtmlOption && etcExist) {
                etcAction = 'uncheck';
            }

            if (arr[0] == $messages['placeholder.none'] && (!isHtmlOption || !exclusiveExist)) {
                arr.splice(0, 1);
                exclusiveAction = 'check';
            }
            else if (arr[0] != $messages['placeholder.none'] && !isHtmlOption && exclusiveExist) {
                exclusiveAction = 'uncheck';
            }

            for (var i = 0; i < arr.length; i++) {
                var liOpt1 = $('<li/>').addClass('normal')[etcExist ? 'insertBefore' : 'appendTo'](etcExist ? etc : container);

                e.preventDefault();

                $.proxy(setupOption, liOpt1, {description: arr[i]})();

                var input1 = $('.input', liOpt1);

                if (isHtmlOption) {
                    setTimeout($.proxy(initializeWysiwyg, input1
                        , {placeholder: $messages['placeholder.option']}
                        , {
                            tinymce: 'tinymce-selective'
                        }, i == (arr.length - 1) ? input1 : null), 100);
                } else {
                    setupOptionTextInput(input1, null, i == (arr.length - 1) ? input1 : null);
                }
            }

            if (etcAction) {
                $('[name=flagEtc]').iCheck(etcAction);
            }
            if (exclusiveAction) {
                $('[name=flagExclusive]').iCheck(exclusiveAction);
            }

            setTimeout($.proxy(renumberingOptions, container), 0);
            refreshSelectionCount(null, qContainer1.trigger('make-saving'));

            if (container.children().length == 0) {
                $('[name=minselection], [name=maxselection]', qContainer1).val(1).selectpicker('refresh');
            }

            modal_formattedOptions.modal('hide');
        } else {
            formattedOptions.val('');
            $notify('보기로 만들 내용이 없습니다. 확인해주세요.');
        }
    });
    var getFormattedOptions = function () {
        var v = $.trim(formattedOptions.val());
        var arr = [];
        if (v) {
            var arr0 = v.split(/\r?\n/);
            for (var i = 0; i < arr0.length; i++) {
                v = $.trim(arr0[i]);

                if (chk_formattedOptions.prop('checked')) {
                    v = v.replace(/^\s*(\(?\d+\)?\.?|[①-⓿])\s*/, '');
                }
                if (v) {
                    arr.push(v);
                }
            }
        }
        return arr;
    };
    var submit_formattedOptions = $(':submit', modal_formattedOptions);
    var placeholder_formattedOptions = formattedOptions.parent().children('.placeholder').click(function () {
        formattedOptions.trigger('focus');
    });
    var chk_formattedOptions = $(':checkbox', modal_formattedOptions)
        .iCheck({checkboxClass: 'icheckbox-opensurvey-xs', radioClass: 'iradio-opensurvey-xs'});

    var autoReheight = function (textarea, maxHeight) {
        if (textarea && textarea.length > 0) {
            textarea.on('input propertychange', function () {
                var self = $(this);
                self.css('height', '');

                var current = this.scrollHeight + self.data('offset');
                var max = self.data('maxHeight');
                self.height(current > max ? max : current);
            }).data({
                offset: textarea[0].offsetHeight - textarea[0].clientHeight
                - parseInt(textarea.css('padding-top'), 10) - parseInt(textarea.css('padding-bottom'), 10)
                , maxHeight: maxHeight ? maxHeight : Infinity
            });
            return textarea.trigger('input');
        }
    };


    var reviewSummary = $('#review-summary .content');
    var setupReviewSummaryInput = function (input) {
        if (input && input.length) {
            autoReheight(input).on('input propertychange', function (e) {
                if (e.originalEvent) {
                    $ws.take(300);
                }
            });
        }
    };
    var reviewSummaryInput = $('#review-summary textarea');
    setupReviewSummaryInput(reviewSummaryInput);

    var safeMarkdownToHTML = function (text) {
        try {
            return markdown.toHTML(text);
        } catch (ignored) {
            return '<i>Markdown 렌더링에 실패했습니다.<br>내용을 수정하시거나, 삭제 후 다시 입력해주세요.</i>';
        }
    }

    if (reviewSummary.is(':visible')) {
        reviewSummary.html(safeMarkdownToHTML(reviewSummary.text()));
    }
    var reviewSummaryFrm = $('#review-summary form').submit(function (e) {
        var $this = $(this);
        var textarea = $('textarea', $this);
        var text = $.trim(textarea.val());

        e.preventDefault();

        $('button', $this).prop('disabled', true);

        $restfulAjax($apiPathPrefix.survey + '/review-summary', 'PUT', {comment: text}, $.proxy(function (r) {
            if (r.success) {
                this.closest('dd').addClass('hide').find('button').prop('disabled', false).end()
                    .parent().closest('dd').addClass('readonly');
                reviewSummary.html(safeMarkdownToHTML(r.body.comment)).closest('dd').removeClass('hide');
                reviewSummaryInput = $('<textarea/>').addClass('form-control').append(r.body.comment).insertAfter(this);
                setupReviewSummaryInput(reviewSummaryInput);
                this.remove();
            } else {
                console.error('관리자 권한이 없어서 수정되지 못했어요.');
            }
            $ws.take(5);
        }, textarea));
    });
    $('#btn-review-summary-update').click(function () {
        var textarea = $(this).closest('dd').addClass('hide').siblings('.update').removeClass('hide').find('textarea');
        setTimeout($.proxy(function () {
            this.trigger('input').focus();
        }, textarea.closest('.readonly').removeClass('readonly').end()), 50);
    });
    $('#btn-review-summary-remove').click(function () {
        if (confirm('리뷰 내용을 삭제하시겠습니까?')) {
            reviewSummaryInput.val('');
            reviewSummaryFrm.trigger('submit');
        }
    });

    if (reviewSummaryInput.is(':visible')) {
        reviewSummaryInput.trigger('input');
    }


    var actionsSidebar = $('#btn-remove-q, #btn-copy-q, #btn-move-q').prop('disabled', true);
    $('#btn-fold-batch').click(function () {
        $('.-container').toggleClass('folded-batch');
        $(this).blur();
    });
    $('#btn-remove-q').click(function () {
        var targets = containerBatch.children(':has(.ui-selected)').map(function () {
            return $(this).data('id');
        }).get();

        if (targets.length) {
            pipingService.find(targets);

            if ((pipingService.ranks.length && confirm($messages['confirm.deleteQuestionPiped'].replace('{0}', pipingService.ranks.join(', ')) + '\n' + $messages['confirm.deleteQuestion']))
                || (!pipingService.ranks.length && confirm($messages['confirm.deleteQuestion']))) {
                var chain = targets.concat(pipingService.questionno);

                busyService.start();

                $('[contenteditable]', chain.map(function (item) {
                    return '#q' + item;
                }).join(',')).each(function () {
                    try {
                        var self = $(this);
                        self.tinymce().destroy();
                    } catch (e) {
                    }
                }).promise().always($.proxy($restfulAjax, null, $apiPathPrefix.question, 'DELETE',
                    chain, $.proxy(function (r0) {
                        containerQ.children().each($.proxy(function (idx, el) {
                            var self = $(el);
                            if ($.inArray(parseInt(self.attr('id').substring(1), 10), this) >= 0) {
                                self.remove();
                            }
                        }, this));

                        for (var idx = questions.length - 1; idx >= 0; idx--) {
                            if ($.inArray(questions[idx].questionno, this) >= 0) {
                                questions.splice(idx, 1);
                            }
                        }

                        if (questions.length) {
                            $.proxy(onSuccessSorting, function () {
                                refreshSidebar();
                                busyService.end();
                            }, r0)();
                        } else {
                            refreshSidebar();

                            busyService.end();
                        }

                        if (questions.length === $profiles.length) {
                            containerQuestions.addClass('new-survey');
                        }

                        setSelectQuestionNumber(questions.length);

                        refreshAlerts();
                    }, chain)));
                $ws.take();
            }
        }
    });
    var copyQuestions = function (qNoList, callback) {
        var targets = $.map(qNoList, function (qNo) {
            var copied = $.extend(true, {}, findQbyQNo(qNo), {survey: {surveyno: surveyno}});
            delete copied.fieldErrors;

            for (var idx in copied.surveyQuestionOptionses) {
                delete copied.surveyQuestionOptionses[idx].fieldErrors;
            }
            return copied;
        });

        $restfulAjax($apiPathPrefix.question + '/copy', 'POST', targets, function (r0) {
            if (!r0.success) {
                alert('최대 문항 수를 초과했습니다.');
                location.reload();
                return;
            }

            var copiedQuestions = [];
            for (var i in r0.body) {
                var isNew = true;
                for (var j in questions) {
                    if (questions[j].questionno == r0.body[i].questionno) {
                        isNew = false;
                    }
                }
                if (isNew) {
                    var newCopy = $.proxy(drawQuestion, r0.body[i])().children();
                    copiedQuestions.push(newCopy);
                    newCopy.parent().removeClass('heel');
                }
            }
            questions = r0.body;
            setSelectQuestionNumber(questions.length);

            $.proxy(onSuccessSorting, function () {

                refreshSidebar();
                if (callback) {
                    // 현재 callback이 있는 경우 복사할 question은 1개임
                    $.proxy(callback, copiedQuestions[0])();
                } else {
                    busyService.end();
                }
            }, r0)();
        });
    };
    $('#btn-copy-q').click(function () {
        var deferred = $.proxy(copyQuestions, null, containerBatch.children(':has(.ui-selected)').map(function (i, e) {
            return $(e).data('id');
        }));

        if ($('.to-be-saved').length) {
            save(deferred);
        } else {
            busyService.start();

            deferred();
        }
        $ws.take();
    });
    $('#btn-move-q').click(function () {
        var ranks = [];
        var previous = [];
        var targets = containerBatch.children().map(function (idx, el) {
            var $this = $(el);
            var id = $this.data('id');

            previous.push(id);

            if ($this.has('.ui-selected').length) {
                return id;
            } else {
                ranks.push({rank: idx + 1, questionno: id});
                return null;
            }
        }).get();

        if (ranks.length) {
            var target = $('[name=target]', modalReorderingQuestions).empty();
            for (var i = 0; i < ranks.length; i++) {
                $('<option/>').val(ranks[i].rank + ':' + ranks[i].questionno).append(ranks[i].rank).appendTo(target);
            }
            target.selectpicker('refresh');

            modalReorderingQuestions.data({targets: targets, ranks: ranks, previous: previous}).modal();
        } else {
            $notify($messages['notify.cannotChangeOrder']);
        }
    });
    var modalReorderingQuestions = $('#modal-reordering-questions').find('form').submit(function (e) {
        var data = modalReorderingQuestions.data();
        var target = $('[name=target]', modalReorderingQuestions).val().split(':').pop();
        var position = $('[name=position]', modalReorderingQuestions).val();
        var reordering = $.map(data.ranks, function (item) {
            return item.questionno;
        });
        e.preventDefault();

        for (var i in reordering) {
            if (target == reordering[i]) {
                reordering.splice.apply(reordering, [Number(i) + (position == 'insertAfter' ? 1 : 0), 0].concat(data.targets));
                break;
            }
        }

        if (JSON.stringify(reordering) != JSON.stringify(data.previous)) {
            $restfulAjax($apiPathPrefix.question + '/reordering', 'PUT', reordering
                , $.proxy(onSuccessSorting, function () {
                    refreshSidebar();
                    modalReorderingQuestions.modal('hide');
                    busyService.end();
                }));
        } else {
            $notify($messages['notify.orderCondition']);
        }
    }).end();

    $('#btn-cancel-selecting').click(function () {
        navBatch.removeClass('selecting').find('.ui-selected').removeClass('ui-selected');
    });

    var batchViewType = $('[name=viewType]').change(function () {
        if (this.checked) {
            navBatch.removeClass('type-tile type-list').addClass('type-' + this.value);

            if (this.value == 'list') {
                batchListQuestion.find('.btn').each(function (i) {
                    setTimeout($.proxy(measureHeightBatchList, $(this).closest('.row')), i * 10);
                });
            } else {
                setTimeout(function() {
                    $('.ellipsis', navBatch).dotdotdot('update');
                }, 0);
            }
        }
    });
    // setTimeout(function () {
    //     batchViewType.trigger('change');
    // }, 50);

    $('#question-view-type-list-button').click(function() {
        if(!$(this).hasClass('active')) {
            navBatch.removeClass('type-tile').addClass('type-list');
            $('#question-view-type-tile-button').removeClass('active');
            $(this).addClass('active')


            batchListQuestion.find('.btn').each(function (i) {
                setTimeout($.proxy(measureHeightBatchList, $(this).closest('.row')), i * 10);
            });
        }
    });

    $('#question-view-type-tile-button').click(function() {
        if(!$(this).hasClass('active')) {
            navBatch.removeClass('type-list').addClass('type-tile');
            $('#question-view-type-list-button').removeClass('active');
            $(this).addClass('active')

            setTimeout(function() {
                $('.ellipsis', navBatch).dotdotdot('update');
            }, 0);
        }
    });

    $('.type-list .tools .btn').click(function () {
        var self = $(this).blur();
        $('.type-list.container-list .list-question .btn')
            .toggleClass('active', self.hasClass('expand-all')).trigger('click');
    });

    var onKeydownTextarea = function (e) {
        var self = $(this);
        var name = self.attr('name');
        var closest = self.closest('li');

        if ((!e.shiftKey && e.which == 13) || e.which == 40) {
            closest = closest.next();
        }

        closest.find('[name=' + name + ']').focus();
    };
    var onChangeTextarea = function (e) {
        if (!!e || !!batchListQuestion.data('timeout')) {
            clearTimeout(batchListQuestion.data('timeout'));

            var delay = batchListQuestion.data('delay') ? batchListQuestion.data('delay') : 10000;
            batchListQuestion.data('delay', 10000);
            batchListQuestion.data('timeout', setTimeout(function () {
                var arrEC = batchListQuestion.find('[name=entryCondition]').map(function () {
                    return this.value;
                }).get();
                var blocks = batchListQuestion.find('[name=block]');
                var arrBlocks = blocks.map(function () {
                    return this.value;
                }).get();
                var params = [];

                batchListQuestion.removeData('timeout');
                busyService.start();

                for (var i = 0; i < questions.length; i++) {
                    var copied = $.extend(true, {}, questions[i]);
                    delete copied.fieldErrors;

                    for (var idx in copied.surveyQuestionOptionses) {
                        delete copied.surveyQuestionOptionses[idx].fieldErrors;
                    }

                    copied.entrycondition = i < arrEC.length ? $.trim(arrEC[i]) : '';

                    if (i < arrEC.length) {
                        var blockednextqno = arrBlocks[i].replace(/-\D/g, '');
                        copied.blockednextqno = blockednextqno ? (parseInt(blockednextqno, 10) < -1 ? -1 : parseInt(blockednextqno, 10)) : 0;

                        if (blockednextqno != arrBlocks[i]) {
                            blocks.eq(i).val(blockednextqno);
                        }
                    } else {
                        copied.blockednextqno = 0;
                    }

                    params.push(copied);
                }

                $restfulAjax($apiPathPrefix.survey + '/questions', 'PUT', params, function (r) {
                    questions = r = r.body;
                    setSelectQuestionNumber(questions.length);

                    for (var key in r) {
                        var container = $('#q' + r[key].questionno);
                        if (container.hasClass('q-active')) {
                            $('[name=entrycondition]', container).val(r[key].entrycondition);
                            $('[name=blockednextqno]', container).val(r[key].blockednextqno);
                        } else {
                            refreshPreLogic(r[key], $('.pre-logic', container).empty());
                        }
                    }

                    busyService.end();
                })
            }, delay));

            $ws.take();
        }
    };
    var onPasteBatchList = function () {
        batchListQuestion.data('timeout', true);
        batchListQuestion.data('delay', 10);
    };

    var measureHeightBatchList = function () {
        var self = $(this).addClass('no-transition').css('height', '');
        var hasCollapsed = self.hasClass('collapsed');
        if (hasCollapsed) {
            self.removeClass('collapsed');
        }
        self.height(self.height());

        if (hasCollapsed) {
            self.addClass('collapsed');
        }
        self.removeClass('no-transition');
    };

    var refreshSidebarForList = function () {
        var prevScrollPosition = leftSidebar.scrollTop();
        var prevListScrollPosition = leftListSidebar.scrollTop();

        $('.list-option', batchListQuestion).sortable('destroy');
        batchListQuestion.empty();

        $.each(questions, function (i, q) {
            setTimeout(function() {
                addQuestionBatchForList(q);
                if (i === questions.length - 1) {
                    if (batchViewType.filter(':checked').val() == 'list') {
                        batchViewType.trigger('change');
                    }
                }
            }, 200);
        });
        setTimeout(function() {
            leftSidebar.scrollTop(prevScrollPosition);
            leftListSidebar.scrollTop(prevListScrollPosition);
        })
    };
    var addQuestionBatchForList = function (q) {
        var li1 = $('<li/>', {'data-id': q.questionno}).addClass('row').appendTo(batchListQuestion);
        if (isProfile(q.questionno)) {
            li1.addClass('profile');
        }
        var col = $('<div/>').addClass('col-lg-7 col-md-12').appendTo(li1);

        $('<button/>', {'aria-pressed': false, tabindex: -1}).addClass('btn btn-link').append($('<i/>')
            .addClass('fa fa-caret-down')).data('toggle', 'button').appendTo(col).attr('autocomplete', 'off').click(function () {
            var self = $(this).blur();
            self.closest('li').toggleClass('collapsed', self.toggleClass('active').hasClass('active'));
        });

        var item = $('<div/>').addClass('item').appendTo(col);

        $('<label/>').append('Q' + q.rank).appendTo(item);
        $('<span/>').text($('<p/>').html(q.question).text()).appendTo(item);

        item = $('<div/>').appendTo(item);

        var type = 'single';
        for (var key in ENUM.TYPE) {
            if (ENUM.TYPE[key] == q.type) {
                type = key.toLowerCase();
                break;
            }
        }
        $('<span/>').addClass('-badge ' + type).append(defaultAppendableIcon).appendTo(item);
        $('<span/>').addClass('sorting-handle').append(defaultAppendableIcon).appendTo(item);

        var batchListOptions = $('<ol/>').addClass('list-unstyled list-option').appendTo(col);
        if (q.surveyQuestionOptionses) {
            for (var i = 0; i < q.surveyQuestionOptionses.length; i++) {
                var opt = q.surveyQuestionOptionses[i];
                var li2 = $('<li/>', {'data-id': opt.optionno}).appendTo(batchListOptions);
                $('<label/>').append('A' + (opt.rank < 0 ? '0' : opt.rank)).appendTo(li2);

                if (opt.piping) {
                    $('<span/>').addClass('-badge piping').append(defaultAppendableIcon).appendTo(li2);
                }

                $('<span/>').append($('<p/>').html(opt.description).text()).appendTo(li2);

                var rightContainer = $('<div/>').appendTo(li2);

                if (!!opt.nextquestionno) {
                    var nextQ = $('<span/>').addClass('-badge next-q').appendTo(rightContainer);

                    if (opt.nextquestionno > 0) {
                        nextQ.append(defaultAppendableIcon + 'Q' + opt.nextquestionno);
                    } else {
                        nextQ.append('선택시 설문 종료');
                    }
                }
                if (opt.rank < 0 || opt.etc) {
                    $('<span/>').addClass('-badge').append(opt.rank < 0 ? $messages['label.none'] : $messages['label.other']).appendTo(rightContainer);
                }

                if (q.random) {
                    $('<span/>').addClass('-badge random').append(defaultAppendableIcon).appendTo(rightContainer);
                }

                if (!(opt.rank < 0 || opt.etc) && !opt.piping) {
                    li2.addClass('normal');
                }

                $('<span/>').addClass('sorting-handle').append(defaultAppendableIcon).appendTo(rightContainer);
            }
            batchListOptions.sortable($.extend({}, defaultSortableOptionsForBatchList, {
                draggable: '.normal', disabled: lockService.isLock,
                onUpdate: function () {
                    var container = $(this.el);
                    var q = $.extend(true, {}, findQbyQNo(container.closest('li').data('id')));
                    var countExclusive = 0;
                    var arrSorted = container.children().map(function () {
                        return $(this).data('id');
                    }).get();
                    var arr = [];

                    delete q.fieldErrors;

                    for (var i = 0; i < arrSorted.length; i++) {
                        for (var key in q.surveyQuestionOptionses) {
                            var opt = q.surveyQuestionOptionses[key];
                            if (opt.optionno == arrSorted[i]) {
                                if (opt.rank < 0) {
                                    countExclusive++;
                                } else {
                                    opt.rank = i + 1 - countExclusive;
                                }
                                delete opt.fieldErrors;
                                arr.push(opt);
                                break;
                            }
                        }
                    }
                    q.surveyQuestionOptionses = arr;


                    var deferred = $.proxy(function (params) {
                        $restfulAjax($apiPathPrefix.survey + '/questions', 'PUT', params, $.proxy(function (r) {
                            var previousScrollTop = elWin.scrollTop();

                            r = r.body;
                            for (var idx in r) {
                                var modified = r[idx];

                                for (var i in questions) {
                                    if (questions[i].questionno == modified.questionno) {
                                        questions[i] = modified;
                                        break;
                                    }
                                }
                            }

                            containerQ.empty();
                            refreshQuestions(questions, previousScrollTop);

                            setTimeout($.proxy(function () {
                                batchListQuestion.closest('.overflow').scrollTop(this.previousScrollTop);
                            }, this), 10);
                        }, this));
                    }, {previousScrollTop: batchListQuestion.closest('.overflow').scrollTop()}, [q]);

                    if ($('.to-be-saved').length) {
                        save(deferred);
                    } else {
                        setTimeout(deferred, 50);
                    }

                    busyService.start();
                    $ws.take();
                }
            }));
        }

        col = $('<div/>').addClass('col-lg-4 visible-lg-block').appendTo(li1);
        var containerTextarea = $('<div/>').addClass('container-textarea').appendTo(col);
        $('<textarea/>', {name: 'entryCondition'}).val(q.entrycondition ? q.entrycondition : '')
            .appendTo(containerTextarea).on({
            keydown: onKeydownTextarea, 'input propertychange': onChangeTextarea,
            paste: onPasteBatchList
        }).attr('id', "q" + q.questionno);
        $('<label/>').addClass('number').append('Q' + q.rank).appendTo(containerTextarea);

        col = $('<div/>').addClass('col-lg-1 visible-lg-block').appendTo(li1);
        containerTextarea = $('<div/>').addClass('container-textarea').appendTo(col);
        $('<input/>', {type: 'text', name: 'block'}).val(q.blockednextqno ? q.blockednextqno : '')
            .appendTo(containerTextarea).on({
            keydown: onKeydownTextarea, 'input propertychange': onChangeTextarea,
            paste: onPasteBatchList
        }).prop('disabled', lockService.isLock);

        return li1;
    };

    var defaultSortableOptionsForBatchList = {animation: 200, handle: '.sorting-handle'};
    var batchListQuestion = $('.list-question').sortable($.extend({}, defaultSortableOptionsForBatchList, {
        filter: '.profile',
        onMove: function (evt) {
            return evt.related.className.indexOf('profile') === -1;
        },
        onUpdate: function (e) {
            setTimeout($.proxy(function () {
                $restfulAjax($apiPathPrefix.question + '/reordering', 'PUT', this.toArray()
                    , $.proxy(onSuccessSorting, function () {
                        $.proxy(renumberingQuestions, containerBatch)();

                        refreshSidebar(true);
                        var batchListChildren = batchListQuestion.children();

                        for (var i = 0; i < questions.length; i++) {
                            batchListChildren.eq(i).find('.item label, .number').text('Q' + questions[i].rank);
                        }
                        busyService.end();
                    }));
            }, this), 50);

            $(e.item).nextAll(':last').andSelf().each(measureHeightBatchList);

            busyService.start();
            $ws.take();
        }
    }));


    $('.welcome a').click(function (e) {
        var type = ENUM.TYPE.SINGLE;

        e.preventDefault();

        switch ($(this).closest('li').index()) {
            case 1:
                type = ENUM.TYPE.SUBJECT_TEXT;
                break;
            case 2:
                type = ENUM.TYPE.RATING;
                break;
            case 3:
                type = ENUM.TYPE.SINGLE_IMAGE;
                break;
            case 4:
                type = ENUM.TYPE.BARCODE;
                break;
        }

        $.proxy(doAddQ, this, {type: type})();
        $ws.take();
    });


    var removeModalImage = function () {
        var origin = $modalCropImage.data('original');
        $ws.take();

        if (origin && (!$(this).is('.btn-link') || confirm($messages['confirm.deleteImage']))) {
            removeImage([origin]);
        }
        imgContainer.addClass('hide');
        cropContainer.children('img').cropper('destroy').end().empty();

        cropMetricsContainer.hide();
        btnCompleteCrop.prop('disabled', true);

        droparea.show();
    };
    var removeImage = function (arr) {
        $restfulAjax($apiPathPrefix.media, 'DELETE', arr, function (r) {
            if (r.body[0].success) {
                // console.debug('미디어 스토리지에서도 파일이 삭제됐습니다.');
            } else {
                alert('미디어 서버에 오류가 발생했습니다. 시스템 관리자에게 알려주시면 감사하겠습니다.')
            }
        });
    };
    var readAsDataURL = function (file) {
        FileAPI.readAsDataURL(file, $.proxy(function (evt/**Object*/) {
            if (evt.type == 'load') {
                // Success
                var dataURL = evt.result;
                generateUploadImage(dataURL, this);
            } else {
                // Error
            }
        }, file));
    };

    var fileTypeValidation = function (file) {
        var validFileTypes = ['image/png', 'image/jpeg', 'image/bmp'];
        if (validFileTypes.indexOf(file.type) >= 0) {
            return true;
        } else {
            alert('지원되지 않는 파일 형식입니다. png, jpg, bmp 확장자의 이미지를 사용해주세요');
            return false;
        }
    };

    var fileSizeValidation = function (file) {
        // ie 낮은 버전에서 FileAPI를 지원하지 않으므로 이 경우 server error로 처리함
        if (!FileAPI.support.html5 || file.size <= 10 * FileAPI.MB) {
            return true;
        } else {
            alert('용량이 너무 큽니다. 10MB보다 작은 용량의 이미지를 사용해주세요');
            return false;
        }
    };

    var fileValidation = function (file) {
        return fileTypeValidation(file) && fileSizeValidation(file);
    };

    $modalCropImage = $('#modal-crop-image').on({
        'show.bs.modal': function () {
            cropMetricsContainer.hide();
            btnCompleteCrop.prop('disabled', true);
            $ws.take(300);
        }, 'hide.bs.modal': removeModalImage
    });
    var droparea = $('#droparea');
    var isSupportFileAPI = FileAPI.support.dnd && FileAPI.support.html5;
    if (isSupportFileAPI) {
        elDoc.dnd(function (over) {
            droparea.toggleClass('dropping', over);
        }, function (files, files2, e) {
            if ($(e.target).closest('#droparea').length && fileValidation(files[0])) {
                busyService.start();
                readAsDataURL(files[0]);
            }
        });
    } else {
        $('p', droparea).hide();
    }
    $('input[type=file]', droparea).on('change', function (e) {
        if (fileValidation(FileAPI.getFiles(this)[0])) {
            if (isSupportFileAPI) {
                readAsDataURL(FileAPI.getFiles(e)[0]);
            } else {
                var data = $modalCropImage.data();

                $ws.take(300);

                uploadType.val(data.type);
                uploadId.val(data.id);
                droparea.attr('action', $apiPathPrefix.media + '/upload').submit();
            }

            FileAPI.reset(e.currentTarget);
            busyService.start();
        }
    }).click($.proxy($ws.take, $ws, 300));

    var uploadType = $('[name=type]', droparea);
    var uploadId = $('[name=id]', droparea);

    var imgContainer = $('.img-container', $modalCropImage);
    var cropContainer = $('.crop-container', imgContainer);
    var filenameDisplay = $('span:first', imgContainer);
    var getCroppedUrlFromArchived = function (url) {
        var idx = url.lastIndexOf('/') + 1;
        var nameWithoutExtension = url.substring(idx, url.lastIndexOf('.'));
        var extension = url.substring(url.lastIndexOf('.'));
        nameWithoutExtension = encodeURIComponent(decodeURIComponent(nameWithoutExtension.substring(0, nameWithoutExtension.length - 9)));
        return url.substring(0, idx) + nameWithoutExtension + '-cropped' + extension;
    };
    var getArchivedUrlFromCropped = function (url) {
        var idx = url.lastIndexOf('/') + 1;
        var nameWithoutExtension = url.substring(idx, url.lastIndexOf('.'));
        var extension = url.substring(url.lastIndexOf('.'));
        nameWithoutExtension = encodeURIComponent(decodeURIComponent(nameWithoutExtension.substring(0, nameWithoutExtension.length - 8)));
        return url.substring(0, idx) + nameWithoutExtension + '-archived' + extension;
    };
    var generateCropFilename = function (url, dataStore, file) {
        var filename = file ? file.name : url.substring(url.lastIndexOf('/') + 1);
        var nameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
        var extension = filename.substring(filename.lastIndexOf('.'));

        if (file) {
            nameWithoutExtension += '-' + (new Date().getTime() - $diffWithStandard);
        } else {
            nameWithoutExtension = decodeURIComponent(nameWithoutExtension.substring(0, nameWithoutExtension.length - 9));
        }
        dataStore.data('filename', nameWithoutExtension + '-cropped' + extension);

        nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.length - 14);
        return nameWithoutExtension + extension;
    };
    var generateUploadImage = function (url, file) {
        droparea.hide();

        filenameDisplay.text(generateCropFilename(url, $modalCropImage, file));


        if (!file && !isSupportFileAPI &&
            url.indexOf(location.href.substring(0, location.href.indexOf(location.pathname))) < 0) {
            url = '/bypass?url=' + encodeURIComponent(url);
        }

        // imagesLoaded는 100% IE9 때문에... IE9이 제외되면 load이벤트핸들링으로 간단히 가능
        return $('<img/>', {src: url}).imagesLoaded(function () {
            var self = $(this.elements[0]);
            if (!self.data('data')) {
                self.cropper({
                    viewMode: 2, autoCropArea: 1, guides: false, built: function () {
                        var $this = $(this);
                        var d = $this.data('data');
                        if (d) {
                            $this.cropper('setData', d);
                        } else {
                            var src = $this.attr('src');

                            // CORS 이미지(원본)를 replace했을 때 security경고를 극복못해서 원본이미지 cloning... 버그일지도 모르겠네요.
                            if (src.indexOf('data:') < 0) {
                                var data = $this.cropper('getData');
                                var metrics = $this.cropper('getImageData');

                                $this.cropper('setData', {
                                    x: 0, y: 0, width: metrics.naturalWidth, height: metrics.naturalHeight, rotate: 0
                                });
                                cropHistory = [{url: $this.cropper('getCroppedCanvas').toDataURL()}];
                                $this.cropper('setData', data);
                            } else {
                                cropHistory = [{url: src}];
                            }

                            cropMetricsContainer.show();
                            btnCompleteCrop.prop('disabled', false);

                            busyService.end();
                        }
                    }, crop: function (data) {
                        cropWidth.val(Math.round(data.width));
                        cropHeight.val(Math.round(data.height));
                    }
                });

                cropBack.hide();

                imgContainer.removeClass('hide');
            }
        }).appendTo(cropContainer.children('img').cropper('destroy').end().empty());
    };
    var saveCroppedOptionImage = function () {
        var imageContainer3 = $(this).closest('.image-container');
        var opt = imageContainer3.closest('li');
        var dataURL = imageContainer3.addClass('changed').end()
            .cropper('getCroppedCanvas', {width: 640, height: 480}).toDataURL();

        busyService.start(true);
        $ws.take();

        $restfulAjax($apiPathPrefix.media + '/upload', 'POST', {
            type: $('[name=type]', opt).val(), id: $('[name=id]', opt).val(), dataURL: dataURL,
            originalFilename: imageContainer3.data('filename')
        }, $.proxy(function () {
            busyService.end();
            $(this).closest('.image-container').removeClass('changed').closest('.q-container').trigger('make-saving');
        }, this));
    };
    var generateUploadOptionImage = function (archivedUrl, container, data, callback) {
        var croppedUrl = getCroppedUrlFromArchived(archivedUrl);
        var imageContainer = $('<div/>').addClass('image-container')
            .data('filenameOrigin', croppedUrl)
            .appendTo(container.find('.btn-upload').css('visibility', 'hidden').end());

        if (!data || !data.piping) {
            var cropContainer2 = $('<div/>').addClass('crop-container').appendTo(imageContainer);
            var cropBoxWidth = 310, cropBoxHeight = 180;
            var params = {
                guides: false, autoCropArea: 1, zoomOnWheel: false, cropstart: function () {
                    $ws.take(300);
                }, cropend: saveCroppedOptionImage, built: function () {
                    var self = $(this);
                    var cropperData = self.data('cropperData');
                    if (cropperData) {
                        if (cropperData.imageCropperCanvasData) {
                            self.cropper('setCanvasData', JSON.parse(data.imageCropperCanvasData));
                        }
                        if (cropperData.imageCropperData) {
                            self.cropper('setData', JSON.parse(data.imageCropperData));
                        }
                    }
                    if (!cropperData || !cropperData.imageCropperData) {
                        self.cropper('setCropBoxData', {width: cropBoxWidth, height: cropBoxHeight});
                    }
                    if (callback) {
                        var clonedImg = $('.cropper-canvas img', cropContainer2); // crop을 위해 cropper에서 복제한 이미지
                        if (clonedImg[0].complete) {
                            $.proxy(callback, this)();
                        } else {
                            clonedImg.one('load', $.proxy(callback, this));
                        }
                    }
                    busyService.end(self.closest('.q-container'));
                }
            };

            var cropControl = $('<div/>').addClass('crop-control').appendTo(cropContainer2);
            $('<button/>', {type: 'button', title: '원본으로 되돌리기'}).click(function () {
                var self = $(this).closest('.crop-container').children('img:first');
                self.cropper('reset');
                self.cropper('setCropBoxData', {width: cropBoxWidth, height: cropBoxHeight});
                self.trigger('cropend.cropper');
            }).addClass('btn btn-opensurvey blue').appendTo(cropControl).append($('<i/>').addClass('fa fa-undo'))
                .tooltip({placement: 'right', container: 'body', delay: {show: 200, hide: 0}});

            var btnGroupVertical = $('<div/>', {role: 'group'}).addClass('btn-group-vertical').appendTo(cropControl);
            $('<button/>', {type: 'button', title: '이미지 확대'}).click(function () {
                $(this).closest('.crop-container').children('img:first').cropper('zoom', 0.1);
            }).addClass('btn btn-opensurvey blue').appendTo(btnGroupVertical).append($('<i/>').addClass('fa fa-search-plus'))
                .tooltip({placement: 'right', container: 'body', delay: {show: 200, hide: 0}});
            $('<button/>', {type: 'button', title: '이미지 축소'}).click(function () {
                $(this).closest('.crop-container').children('img:first').cropper('zoom', -0.1);
            }).addClass('btn btn-opensurvey blue').appendTo(btnGroupVertical).append($('<i/>').addClass('fa fa-search-minus'))
                .tooltip({placement: 'right', container: 'body', delay: {show: 200, hide: 0}});

            $('<img/>', {src: archivedUrl}).appendTo(cropContainer2).on('zoom.cropper', function () {
                var $this = $(this);
                clearTimeout($this.data('timeout'));
                $this.data('timeout', setTimeout($.proxy(saveCroppedOptionImage, this), 500));
            }).cropper(params).data('cropperData', data ? data : null);

            var imageFilename = $('<p/>').appendTo(imageContainer);
            $('<span/>').append(generateCropFilename(archivedUrl, imageContainer)).appendTo(imageFilename);

            $('<a/>', {href: ''}).addClass('btn-remove-option-image').append(defaultAppendableIcon)
                .appendTo(imageFilename).click(function (e) {
                e.preventDefault();

                if (confirm($messages['confirm.deleteImage'])) {
                    var imageContainer2 = $(this).closest('.image-container');
                    var data = imageContainer2.children('.crop-container > img').cropper('destroy').end().data();
                    var archivedHead = data.filenameOrigin.substring(0, data.filenameOrigin.lastIndexOf('-'));
                    var archivedTail = data.filenameOrigin.substring(data.filenameOrigin.lastIndexOf('-')).replace('cropped', 'archived');
                    removeImage([data.filenameOrigin, archivedHead + archivedTail]);

                    var btnUpload = imageContainer2.closest('li').find('.btn-upload').css('visibility', 'visible');
                    btnUpload.end().closest('.q-container').trigger('make-saving').end().end().remove();
                    $('[type=file]', btnUpload).val('');
                }
            });
        } else {
            $('<img/>', {src: croppedUrl}).appendTo(imageContainer);
        }

        return imageContainer;
    };

    var cropWidth = $('[name=width]', $modalCropImage).closest('form').submit(function (e) {
        var cropper = cropContainer.children('img');
        e.preventDefault();

        var dataURL = cropper.cropper('getCroppedCanvas').toDataURL();
        var data = cropper.cropper('getData');
        cropHistory.push({url: dataURL, data: data});
        cropper.data('data', {x: 0, y: 0, width: data.width, height: data.height, rotate: 0})
            .cropper('replace', dataURL);

        if (cropHistory.length > 1) {
            cropBack.show();
        }
    }).on('reset', function (e) {
        var previous = cropHistory.pop();
        var url = cropHistory[cropHistory.length - 1].url;

        e.preventDefault();

        if (cropHistory.length <= 1) {
            cropBack.hide();
        }
        cropContainer.children('img').data('data', previous.data).cropper('replace', url);
    }).end().numeric(defaultNumericOptions).prop('readonly', true);
    var cropHeight = $('[name=height]', $modalCropImage).numeric(defaultNumericOptions).prop('readonly', true);
    var cropMetricsContainer = cropWidth.closest('dd');
    var cropBack = $('[type=reset]', $modalCropImage).hide();
    var cropHistory = [];

    $returnUpload = function (r) {
        var url = r.body[0].downloadURL;

        if ($returnUpload.target) {
            generateUploadOptionImage(url, $returnUpload.target, null, saveCroppedOptionImage);

            delete $returnUpload.target;
        } else {
            $modalCropImage.data('original', url);

            generateUploadImage(url);
        }
    };

    var btnCompleteCrop = $('.btn.blue', $modalCropImage).click(function () {
        var data = $modalCropImage.data();
        var cropper = cropContainer.children('img');
        var width = Math.round(cropper.cropper('getData').width);
        var dataURL = cropper.cropper('getCroppedCanvas', {width: width > 640 ? 640 : width}).toDataURL();

        busyService.start();
        $ws.take(300);

        $restfulAjax($apiPathPrefix.media + '/upload', 'POST', {
            type: data.type, id: data.id, dataURL: dataURL, originalFilename: data.filename
        }, function (r) {
            var editor = $modalCropImage.modal('hide').data('editable');
            editor.focus();
            editor.selection.setContent(editor.dom.createHTML('img', {src: r.body.downloadURL}));

            busyService.end();
            $ws.take();
        });
    });
    $('.btn', imgContainer).click(removeModalImage);


    var isLegacy = getInternetExplorerVersion() < 9;
    var lockService = {
        isLock: false, fasten: function (reason) {
            if (!this.isLock) {
                this.isLock = true;

                if (reviewSummaryInput.length) {
                    reviewSummaryInput.closest('dd').addClass('hide').siblings('.view').find('button').prop('disabled', true).end()
                        .parent().closest('dd').addClass('readonly').end().end().removeClass('hide');
                }

                $.each(surveyFields, function (key, el) {
                    var txtarea = $('input, textarea', el);
                    txtarea.val(txtarea.data('persistent')).prop('readonly', true);
                });

                if ($('.q-active').length) {
                    busyService.start(true);
                    $.proxy(deactivate, null, $('.q-active'))();
                }

                surveyDescription.prop('contenteditable', false);
                wholeScroller.addClass('readonly');
                containerBatch.find('.ui-selected').removeClass('ui-selected').end().data('sortable').option('disabled', true);
                navBatch.removeClass('selecting');
                actionsSidebar.prop('disabled', true);
                btnOpenSearchModal.addClass('disabled');
                batchListQuestion.find('input').prop('disabled', true).end()
                    .add(batchListQuestion.find('.list-option')).each(function () {
                    try {
                        $(this).data('sortable').option('disabled', true);
                    } catch (e) {
                    }
                });
                $('.welcome.row.list-unstyled').css('display', 'none')
                setReadOnlyTitle();

                $('.modal.in:not(.read-forced)').modal('hide');

                if (reason && !isLegacy) {
                    if (reason.occupantName) {
                        $notifyTop($ENUM.NOTIFICATION.NEGATIVE,
                            (reason.admin ? $messages['notice.adminEditing'] : $messages['notice.editing'].replace('{0}', reason.occupantName))
                            + ' ' + $messages['notice.readonly']);
                    }
                    if ($ws.principal.email && reason.occupantEmail == $ws.principal.email) {
                        alert($messages['notice.conflict']);
                    }
                }

                floatingToolbar.addClass('animating-hidden');
            }
        }, release: function () {
            if (!isLegacy && this.isLock && $statusService.previousIsFine) {
                surveyDescription.prop('contenteditable', true);
                wholeScroller.removeClass('readonly');
                containerBatch.data('sortable').option('disabled', false);
                btnOpenSearchModal.removeClass('disabled');
                batchListQuestion.add(batchListQuestion.find('.list-option')).each(function () {
                    $(this).data('sortable').option('disabled', false);
                });
                batchListQuestion.find('input').prop('disabled', false);
                $('.welcome.row.list-unstyled').css('display', 'block')
                setCanEditTitle();

                $('button', reviewSummary.closest('dd')).prop('disabled', false);
                $.each(surveyFields, function (key, el) {
                    $('input, textarea', el).prop('readonly', false);
                });

                this.isLock = false;

                $notifyTop($ENUM.NOTIFICATION.POSITIVE, $messages['notice.editable']);
            }
        }
    };


    $.extend($ws, {
        onSubscribe: function (r) {
            switch (r.type) {
                case $ENUM.EXCLUSIVE_SESSION_TYPE.LOCK:
                    if (r.occupant != $ws.session) {
                        lockService.fasten(r);
                        $ws.sessionOwned = r;
                    } else if (!isLegacy) {
                        $notifyTop();
                    }
                    break;
                case $ENUM.EXCLUSIVE_SESSION_TYPE.RELEASE:
                    lockService.release();
                    if ($ws.sessionOwned && $ws.sessionOwned.occupant == $ws.session) {
                        // TODO: 각종 모달 닫기
                        $notify('편집 세션이 종료되어 열려있던 팝업을 닫습니다.');
                    }
                    $ws.sessionOwned = null;
                    break;
                case $ENUM.EXCLUSIVE_SESSION_TYPE.UPDATE_SURVEY:
                    if ($ws.sessionOwned && $ws.sessionOwned.occupant != $ws.session) {
                        var changed = false;

                        $statusService.previousIsFine = true;
                        $statusService.apply(r.body.status);

                        setTitle(r.body.title)

                        $.each(surveyFields, $.proxy(function (key, el) {
                            var txtarea = $('input, textarea', el);
                            for (var field in this) {
                                if (el.attr('id') && el.attr('id').indexOf(field) > 0) {
                                    var persistent = txtarea.data('persistent');
                                    if (persistent != this[field]) {
                                        changed = true;
                                    }

                                    txtarea.data({persistent: this[field], previousContent: this[field]}).val(this[field]);
                                    break;
                                }
                            }
                        }, r.body));

                        $setSaved(r.savedat);

                        if (changed) {
                            $notify($messages['notice.reload']);
                        }
                    }
                    break;
                case $ENUM.EXCLUSIVE_SESSION_TYPE.UPDATE_QUESTIONS:
                    if ($ws.sessionOwned && $ws.sessionOwned.occupant != $ws.session) {
                        var previousScrollTop = elWin.scrollTop();

                        busyService.start();
                        containerQ.empty();
                        refreshQuestions(r.body, previousScrollTop);

                        $notify($messages['notice.reload']);
                    }
                    break;
                case $ENUM.EXCLUSIVE_SESSION_TYPE.UPDATE_REVIEW_SUMMARY:
                    if ($ws.sessionOwned && $ws.sessionOwned.occupant != $ws.session) {
                        reviewSummary.html(safeMarkdownToHTML(r.body.comment));

                        if (r.body.comment) {
                            $('#review-summary').children('dd').addClass('readonly').end().removeClass('hide');
                            $notify('리뷰노트가 방금 업데이트됐습니다. 확인해주세요.');
                        } else {
                            if (!$ws.principal.admin) {
                                $('#review-summary').addClass('hide');
                            }
                            $notify('리뷰노트가 방금 삭제됐습니다.');
                        }
                    }
                    reviewSummaryInput.val(r.body.comment);
                    break;
                case $ENUM.EXCLUSIVE_SESSION_TYPE.UPDATE_SURVEY_STATUS:
                    $statusService.apply(r.body.status);
                    busyService.end();
            }
        }, onChecked: function (r) {
            if (r.occupant && r.occupant != this.session) {
                lockService.fasten(r);
                this.sessionOwned = r;
            }
        }, lock: function (reason0) {
            var previousIsLock = lockService.isLock;
            lockService.fasten(reason0);
            return previousIsLock;
        }, release: $.proxy(lockService.release, lockService)
    });


    var initializeComment = function (container) {
        var comments = container.data('comments') || [];
        $('.comment-count > span', container).append($messages['label.commentCount'].replace('{0}', comments.length));

        renderCommentSummary(container);

        if (container.data('countResolved')) {
            container.closest('.q-container').find('.btn-resolved-comments').parent().show().removeClass('animating-hidden');
        }
    };
    var renderCommentSummary = function (container) {
        var comments = container.data('comments') || [];
        container = container.children('.comment-container');
        container.children('.comment-body, .comment-summary').remove();

        if (comments.length) {
            var firstComment = comments[0];
            var summaryContainer = $('<div/>').addClass('comment-summary').appendTo(container);
            var firstCommentContainer = $('<dl/>').addClass('comment').appendTo(summaryContainer);

            var writer = $('<dt/>').appendTo(firstCommentContainer);
            if (firstComment.writerAdmin) {
                writer.append(defaultAppendableIcon).children().addClass('opensurvey');
            } else {
                writer.append(firstComment.name);
            }
            $('<dd/>').addClass('date').append(moment(firstComment.created).format('YYYY-MM-DD')).appendTo(firstCommentContainer);
            $('<dd/>').append(safeMarkdownToHTML(firstComment.body)).appendTo(firstCommentContainer);

            if (comments.length > 1) {
                $('<div/>').addClass('comment-more').appendTo($('<div/>').addClass('comment-more').appendTo(summaryContainer));
            }
        } else {
            container.hide();
        }
    };


    var updateComments = function (comments, path, updated) {
        var level = 0;

        while (path.length > level) {
            for (var i = 0; i < comments.length; i++) {
                if (comments[i].commentNo == path[level]) {
                    if (path.length > ++level) {
                        comments = comments[i].children;
                    } else {
                        if (updated) {
                            comments[i] = updated;
                        } else {
                            comments.splice(i, 1);
                        }
                    }
                    break;
                }
            }
        }
    };
    var removeComment = function (self, isArchiving) {
        var params = {commentNo: self.attr('id').substring(1)};

        if (isArchiving) {
            self.isArchiving = true;
        } else {
            params.deleted = new Date().getTime();
        }

        $restfulAjax($apiPathPrefix.question + '/' + self.closest('.q-container').parent().attr('id').substring(1) + '/comments'
            , 'DELETE', params, $.proxy(function (r) {
                if (r.success) {
                    var qContainer4 = this.closest('.q-container');
                    var comments = roots = qContainer4.data('comments');
                    updateComments(comments, r.body);

                    this.closest('.comment-container').find('.comment-count > span').text($messages['label.commentCount'].replace('{0}', roots.length))
                        .end().end().closest(this.hasClass('reply') ? 'form' : 'li').remove();

                    if (this.isArchiving) {
                        var li = qContainer4.find('.btn-resolved-comments').parent();
                        var width = li.show().width() + 1;

                        li.width(0).delay(10).removeClass('animating-hidden').width(width);
                    }
                }
            }, self));
    };
    var generateComment = function (c, frm, isRoot) {
        var dl = $('<dl/>', {id: 'c' + c.commentNo}).addClass('comment').appendTo(frm);
        $('<dt/>').append(c.writerAdmin ? $('<i/>').addClass('icon opensurvey') : c.name).appendTo(dl);
        $('<dd/>').addClass('date').append(moment(c.created).format('YYYY-MM-DD')).appendTo(dl);
        $('<dd/>').addClass('content').append(safeMarkdownToHTML(c.body)).appendTo(dl);

        var input = $('<dd/>').addClass('input').appendTo(dl);
        $('<textarea/>', {placeholder: (isRoot ? $messages['placeholder.comment'] : $messages['placeholder.reply'])}).addClass('form-control').html(c.body).appendTo(input);

        var buttons = $('<dd/>').addClass('buttons').appendTo(dl);
        $('<button/>').addClass('btn btn-opensurvey blue').append($messages['button.save']).appendTo(buttons);
        $('<button/>', {type: 'reset'}).addClass('btn btn-opensurvey border-only').append($messages['button.cancel']).appendTo(buttons).click(function () {
            $(this).closest('.comment').removeClass('editing');
        });

        if (isRoot) {
            var resolve = $('<dd/>').addClass('resolve').appendTo(dl);
            $('<button/>', {type: 'button'}).addClass('btn btn-opensurvey border-only')
                .append(defaultAppendableIcon + $messages['button.resolve']).appendTo(resolve).click(function () {
                removeComment($(this).closest('.comment'), true);
            });

            var addReply = $('<dd/>').addClass('add-reply').appendTo(dl);
            $('<a/>', {href: ''}).append($messages['button.reply']).appendTo(addReply).click(function (e) {
                var newContainer = $(this).closest('li');

                e.preventDefault();

                if (!newContainer.find('.reply.new').length) {
                    generateNewComment(newContainer, true);
                } else {
                    newContainer.find('.reply.new textarea').focus();
                }
            });
        } else {
            dl.addClass('reply');
        }

        if ((c.writerAdmin != null && $ws.principal.admin)
            || ($ws.principal.email && c.email && $ws.principal.email == c.email)) {
            var controls = $('<dd/>').addClass('controls').appendTo(dl);
            $('<button/>', {type: 'button'}).addClass('btn btn-link btn-update')
                .append(defaultAppendableIcon).appendTo(controls).click(function () {
                setTimeout($.proxy(function () {
                    if (!this.data('offset')) {
                        autoReheight(this);
                    }
                    this.trigger('input').focus();
                }, $(this).closest('.comment').addClass('editing').find('textarea')), 50);
            });
            $('<button/>', {type: 'button'}).addClass('btn btn-link btn-remove')
                .append(defaultAppendableIcon).appendTo(controls).click(function () {
                if (confirm($(this).closest('.comment').hasClass('reply') ? $messages['confirm.deleteReply'] : $messages['confirm.deleteComment'])) {
                    removeComment($(this).closest('.comment'));
                }
            });
        }

        return dl;
    };
    var modifyComment = function (e) {
        var self = $(this).find('.comment');
        var val = $.trim(self.find('textarea').val());

        e.preventDefault();

        if (val.replace(/\s/ig, '')) {
            $restfulAjax($apiPathPrefix.question + '/' + self.closest('.q-container').parent().attr('id').substring(1) + '/comments'
                , 'PUT', {commentNo: self.attr('id').substring(1), body: val}, $.proxy(function (r, textStatus, jqXHR) {
                    if (r.success) {
                        this.find('.content').html(safeMarkdownToHTML(r.body.comment.body))
                            .end().removeClass('editing').find('textarea').html(r.body.comment.body);

                        updateComments(jqXHR.qContainer.data('comments'), r.body.parents, r.body.comment);
                        postSavingCommentsForDeactivating.func(jqXHR.qContainer);
                    }
                }, self)).qContainer = self.closest('.q-container');
        } else if (confirm('코멘트 내용이 없이 저장하려는 건, 지우겠단 뜻이죠?')) {
            removeComment(self);
        }
    };
    var generateRootComment = function (root) {
        var li = $('<li/>');
        var frm = $('<form/>').appendTo(li).submit(modifyComment);
        generateComment(root, frm, true);

        return li;
    };

    var renderCommentbody = function (container) {
        var comments = container.data('comments') || [];
        container = container.children('.comment-container');
        container.children('.comment-body, .comment-summary').remove();

        var bodyContainer = $('<div/>').addClass('comment-body').appendTo(container);
        var commentsContainer = $('<ul/>').addClass('comments').appendTo(bodyContainer);

        if (comments.length) {
            for (var i = 0; i < comments.length; i++) {
                var root = comments[i];
                var li = generateRootComment(root).appendTo(commentsContainer);

                if ($(document.body).hasClass("print-with-comment")) {
                    $(li).find(".comment").addClass("print-comment");
                    $(li).find(".comment").removeClass("comment");
                }

                if (root.children && root.children.length) {
                    for (var j = 0; j < root.children.length; j++) {
                        var reply = root.children[j];
                        var frm = $('<form/>').appendTo(li).submit(modifyComment);
                        var dl = generateComment(reply, frm);

                        if ($(document.body).hasClass("print-with-comment")) {
                            $(frm).find(".comment").addClass("print-comment");
                            $(frm).find(".comment").removeClass("comment");
                        }

                        $('<dd/>').addClass('sign').append(defaultAppendableIcon).appendTo(dl);
                    }
                }
            }
        } else {
            container.hide();
        }
    };

    var generateNewComment = function (container, isReply) {
        var frm = $('<form/>').appendTo(container).submit(function (e) {
            var self = $(this);
            var qContainer = self.closest('.q-container');
            var qno = qContainer.parent().attr('id').substring(1);
            var params = {surveyQuestion: {questionno: qno}, body: self.children('.comment').find('textarea').val()};

            e.preventDefault();

            if (self.children().hasClass('reply')) {
                params.parent = {commentNo: self.prevAll().last().children().attr('id').substring(1)};
            }

            $restfulAjax($apiPathPrefix.question + '/' + qno + '/comments', 'POST', params, $.proxy(function (r, textStatus, jqXHR) {
                if (this.children().hasClass('reply')) {
                    var frm = $('<form/>').appendTo(this.closest('li')).submit(modifyComment);
                    var dl = generateComment(r.body.comment, frm);

                    $('<dd/>').addClass('sign').append(defaultAppendableIcon).appendTo(dl);

                    var comments = this.closest('.q-container').data('comments');
                    var parentNo = this.prevAll().last().children().attr('id').substring(1);
                    for (var i in comments) {
                        if (parentNo == comments[i].commentNo) {
                            if (!comments[i].children) {
                                comments[i].children = [];
                            }
                            comments[i].children.push(r.body.comment);
                        }
                    }
                    this.remove();
                } else {
                    var container = this.closest('.comments');
                    generateRootComment(r.body.comment).prependTo(container);

                    container.closest('.comment-container').find('.comment-count > span')
                        .text($messages['label.commentCount'].replace('{0}', container.closest('.q-container').data('comments').unshift(r.body.comment)));

                    this.closest('li').remove();
                }

                postSavingCommentsForDeactivating.func(jqXHR.qContainer);
            }, self)).qContainer = qContainer;
        });
        var dl = $('<dl/>').addClass('comment new').appendTo(frm);

        $('<dt/>').append($ws.principal.admin ? $('<i/>').addClass('icon opensurvey') : $ws.principal.name).appendTo(dl);

        var input = $('<dd/>').addClass('input').appendTo(dl);
        autoReheight($('<textarea/>', {
            placeholder: isReply ? $messages['placeholder.reply'] : $messages['placeholder.comment']
        }).addClass('form-control').appendTo(input).focus(), 145);

        var buttons = $('<dd/>').addClass('buttons').appendTo(dl);
        $('<button/>').addClass('btn btn-opensurvey blue').append($messages['button.save']).appendTo(buttons);
        $('<button/>', {type: 'reset'}).addClass('btn btn-opensurvey border-only').append($messages['button.cancel']).appendTo(buttons).click(function (e2) {
            var container = $(this).closest('form');

            if (!$('textarea', container).val().replace(/\s/ig, '') || confirm($messages['confirm.cancel'])) {
                if (!container.children().hasClass('reply')) {
                    container = container.closest('li');

                    if (!container.siblings().length) {
                        container.closest('.comment-container').hide();
                    }
                }
                container.remove();
            } else {
                e2.preventDefault();
            }
        });

        if (isReply) {
            dl.addClass('reply');

            $('<dd/>').addClass('sign').append(defaultAppendableIcon).appendTo(dl);
        }

        return frm;
    };

    var modalResolvedComments = $('#modal-resolved-comments').on('show.bs.modal', function () {
        $('.comments', this).empty();

        $restfulAjax($apiPathPrefix.question + '/' + modalResolvedComments.data('relatedTarget').attr('id').substring(1) + '/comments/resolved'
            , 'GET', null, function (r) {
                var commentsContainer = $('.comments', modalResolvedComments);

                for (var i = 0; i < r.body.length; i++) {
                    var root = r.body[i];
                    var li = $('<li/>').appendTo(commentsContainer);
                    var frm = $('<form/>').appendTo(li).submit(function (e2) {
                        var self = $(this);
                        var q = modalResolvedComments.data('relatedTarget');

                        e2.preventDefault();

                        busyService.start(true);

                        $restfulAjax($apiPathPrefix.question + '/' + q.attr('id').substring(1) + '/comments/reopening'
                            , 'PUT', {commentNo: self.children().attr('id').substring(2)}, $.proxy(function (r, textStatus, jqXHR) {
                                var comments = r.body.comments;
                                var count = comments.length;

                                var commentContainer = this.data('comments', comments).find('.comment-container')
                                    .find('.comment-count > span').text($messages['label.commentCount'].replace('{0}', count)).end();

                                if (count) {
                                    if (this.parent().hasClass('q-active')) {
                                        renderCommentbody(this);
                                    } else {
                                        renderCommentSummary(this);
                                    }
                                    commentContainer.show();
                                } else {
                                    commentContainer.hide();
                                }

                                var target = jqXHR.target;
                                if (target.siblings().length) {
                                    target.remove();
                                } else {
                                    modalResolvedComments.modal('hide');
                                    this.find('.btn-resolved-comments').parent().hide().addClass('animating-hidden').width('');
                                }

                                busyService.end();
                            }, q.children('.q-container'))).target = self.closest('li');
                    });
                    var dl = $('<dl/>', {id: 'rc' + root.commentNo}).addClass('comment').appendTo(frm);
                    $('<dt/>').append(root.writerAdmin ? $('<i/>').addClass('icon opensurvey') : root.name).appendTo(dl);
                    $('<dd/>').addClass('date').append(moment(root.created).format('YYYY-MM-DD')).appendTo(dl);
                    $('<dd/>').addClass('content').append(safeMarkdownToHTML(root.body)).appendTo(dl);

                    var resolve = $('<dd/>').addClass('resolve').appendTo(dl);
                    $('<button/>').addClass('btn btn-opensurvey border-only')
                        .append(defaultAppendableIcon + $messages['button.reopen']).appendTo(resolve);

                    if (root.children && root.children.length) {
                        for (var j = 0; j < root.children.length; j++) {
                            var reply = root.children[j];
                            dl = $('<dl/>', {id: 'rc' + reply.commentNo}).addClass('comment reply').appendTo(li);
                            $('<dt/>').append(reply.writerAdmin ? $('<i/>').addClass('icon opensurvey') : reply.name).appendTo(dl);
                            $('<dd/>').addClass('date').append(moment(reply.created).format('YYYY-MM-DD')).appendTo(dl);
                            $('<dd/>').append(safeMarkdownToHTML(reply.body)).appendTo(dl);
                        }
                    }
                }

            });
    });


    var modalBlockByErrors = $('#modal-block-by-errors').find('form').submit(function (e) {
        e.preventDefault();
        modalBlockByErrors.modal('hide');
        popoverAlert.removeClass('animating-hidden');
    }).end();

    $('#btn-survey-live').click(function () {
        if(!$('.error-count').hasClass('hide') && location.pathname.indexOf('questions') > -1) {
            alert($messages['error.next']);
            return false;
        }
        // if (containerAlert.children(':not(.fixed, .disabled)').length) {
        //     modalBlockByErrors.find('span').text('진행을').end().modal();
        // } else {
            $ws.take(300);
            modalRequestLive.modal();
        // }
    });

    var modalRequestLive = $('#modal-request-live').find('form').submit(function (e) {
        e.preventDefault();

        busyService.start(true);

        $restfulAjax($apiPathPrefix.survey + '/request-forward', 'PUT',
            {status: $ENUM.SURVEY_STATUS.진행요청중}, function (r) {
                if (r.success) {
                    modalRequestLive.modal('hide');
                }
                $ws.take(1);
            });
    }).end();


    /** ------------------------------- **/


    if (!$isAdmin) {
        var simulatorTooltip = $('.container-simulator [data-toggle="tooltip"]').tooltip({
            title: "<button type='button' class='close'><hr/><hr/></button><strong>'응답 미리보기'</strong>를 통해<br/>실제 응답화면에서<br/>어떻게 보이는지<br/>테스트할 수 있습니다!",
            html: true,
            trigger: 'manual'
        }).tooltip('show');
        $('.container-simulator .tooltip .close').click(function() {
            simulatorTooltip.tooltip('destroy');
        });
    }
    $('.container-alert[data-toggle="tooltip"]').tooltip({delay: {show: 300, hide: 100}});
    $('.container-etc [data-toggle="tooltip"]').tooltip({delay: {show: 300, hide: 100}});

    $('#btn-fullscreen').click(function (e) {
        e.preventDefault();
        $('.-container').toggleClass('full-batch');
        setTimeout(function () {
            $('.ellipsis', navBatch).dotdotdot('update');
        }, 350);

        batchListQuestion.find('.btn').each(function (i) {
            setTimeout($.proxy(measureHeightBatchList, $(this).closest('.row')), i * 10);
        });

        $.each(questions, function(index, q) {  //DOM 이 그려지는 시점에 lockService 실행이 완료되지 않는 문제가 있어 다 그려지고 expand 할 때 disabled 추가
            $("#nav-batch .type-list .list-question li div #q" + q.questionno).prop('disabled', lockService.isLock);
        })

        $(this).blur();

        onChangeTextarea();
    });


    setTimeout(function () {
        if (isLegacy) {
            lockService.fasten();
            $notifyTop($ENUM.NOTIFICATION.NEGATIVE, '인터넷 익스플로러 8.0 이하 버전의 브라우저에서는\
        설문 내용을 <strong>수정</strong>할 수 없습니다. 문항 수정을 원하실 경우\
        <a href="http://browsehappy.com" target="_blank">최신 버전의 브라우저</a>를 사용해 주세요.');
        }
    }, 0);


    /* 여기까지 UI 구현 */

    var surveyno = parseInt(location.pathname.split('/')[2], 10);
    var getRichContent = function (el) {
        var html = el.html();
        return html.indexOf('<img ') >= 0 || html.indexOf('<div ') >= 0 || html.indexOf('<table') >= 0
        || html.indexOf('<hr') >= 0 || $.trim($('<p/>').html(html).text()).length > 0 ? html : '';
    };
    var onChanged = function () {
        var self = $(this);
        if (self.attr('name') == 'minval' || self.attr('name') == 'maxval') {
            if (parseInt(self.val(), 10) < -1999999999) {
                alert($messages['error.minval']);
                self.val('');
            }
            if (parseInt(self.val(), 10) > 1999999999) {
                alert($messages['error.maxval']);
                self.val('');
            }
        }

        self.closest('.q-container').trigger('make-saving', self.is('[type=text]') || self.is('textarea'));
    };


    var busyService = {
        focused: null, timer: null, start: function (immediately) {
            var f = $(':focus').trigger('blur', true);
            var interval = f.length || immediately ? 0 : 800;

            if (f.length) {
                this.focused = f;
            }

            if (!this.timer) {
                this.timer = setTimeout($.proxy(function () {
                    wholeScroller.addClass('busy');
                    $mprogress.start();
                    this.timer = null;
                }, this), interval);
            }
        }, end: function (target) {
            var longInitializingElementsCount = (target ? target.data('longInitializingElementsCount') : 0) || 0;
            var remainingElementsCount = $('.cropper-canvas', target).length + $('.mce-content-body[contenteditable]', target).length;

            if (!target || longInitializingElementsCount == remainingElementsCount) {
                clearTimeout(this.timer);
                this.timer = null;

                $mprogress.end();
                wholeScroller.removeClass('busy');
            } else if (target) {
                if (longInitializingElementsCount) {
                    $mprogress.set(remainingElementsCount / longInitializingElementsCount);
                } else {
                    $mprogress.inc();
                }
            }

            if (this.focused) {
                if (this.focused.is('[contenteditable]')) {
                    this.focused.tinymce().focus();
                } else if (!this.focused.is('.icon.help')) {
                    this.focused.focus();
                }
                this.focused = null;
            }
        }
    };

    var pipingService = {
        ranks: [], questionno: [], recursiveFindingPiping: function (q) {
            for (var idx in questions) {
                var q0 = questions[idx];
                var parentRank = q0.pipingparentrank;
                if (parentRank && parentRank == q.rank) {
                    var rank = q0.rank;
                    if ($.inArray(rank, this.ranks) < 0 && $.inArray(rank, this.original) < 0) {
                        this.ranks.push(rank);
                        this.questionno.push(q0.questionno);
                    }
                    this.recursiveFindingPiping(q0);
                }
            }
        }, find: function (arr) {
            this.ranks = [];
            this.questionno = [];
            this.original = $.map(arr, function (item) {
                return (typeof(item) == 'object' ? item : findQbyQNo(item)).rank;
            });

            for (var i in arr) {
                this.recursiveFindingPiping(typeof(arr[i]) == 'object' ? arr[i] : findQbyQNo(arr[i]));
            }

            this.ranks.sort(function (a, b) {
                return a > b ? 1 : a < b ? -1 : 0;
            });
        }
    };

    var saveSurvey = function (allowHtml) {
        var isChanged = false;
        var params = {_fields: []};
        this.each(function (idx) {
            var $this = $(this);
            var currentContent = $this.val();
            if (!allowHtml) {
                var escaped = $('<p/>').html(currentContent).text();
                if (currentContent.replace(/\s/g, '') != escaped.replace(/\s/g, '')) {
                    $this.val(currentContent = escaped);
                    $notify('HTML 문법이 포함되어 있어, 골라냈어요.');
                }
            }
            params._fields.push($this.closest('[id^=survey-]').attr('id').substring(7));
            params[params._fields[idx]] = currentContent;
            if (currentContent !== $this.data('persistent')) {
                isChanged = true;
            }
        });

        if (isChanged) {
            $restfulAjax($apiPathPrefix.survey, 'PUT', params, $.proxy(function (r, textStatus, jqXHR) {
                this.each(function (idx) {
                    $(this).data('persistent', jqXHR.tempVal[jqXHR.tempVal._fields[idx]]).closest('[id^=survey-]').removeClass('has-error');
                });
                $setSaved(r.savedat);
                setTitle(r.body.title);
            }, this), $.proxy(function (jqXHR) {
                if (jqXHR.status === 400 && jqXHR.responseJSON) {
                    $setSaved(jqXHR.responseJSON.savedat);

                    if (jqXHR.responseJSON.editorFieldErrors) {
                        this.each(function (idx) {
                            var container = $(this).data('persistent', jqXHR.tempVal[jqXHR.tempVal._fields[idx]]).closest('[id^=survey-]');
                            var helpBlock = $('.help-block', container).text(jqXHR.responseJSON.editorFieldErrors[idx].message);
                            var h = helpBlock.height();
                            helpBlock.height(0);
                            container.addClass('has-error');
                            helpBlock.delay(10).height(h);
                        });
                    }
                }
            }, this)).tempVal = params;
        }
        this.removeClass('to-be-saved-for-survey');
    };
    var compareWithPersistentContent = function (slow) {
        var currentContent = getRichContent(this);

        // DB최종값과 같으면 저장 명령을 철회해야하는가.. 이건 개별 필드여서, 다른 필드가 변경된 게 있으면 바로 확인이 어려워요. 그래서 사실 유명무실해졌음.
        if (currentContent != this.data('persistent')) {
            //console.debug('DB와 다름을 최종 확인하고 저장 명령!', currentContent, this.data('persistent'));
            this.closest('.q-container').trigger('make-saving', slow);
        }
    };
    var defaultWysiwigEvents = {
        focus: function (e) {
            if (floatingToolbar.hasClass('hidden-mce-only')) {
                floatingToolbar.removeClass('hidden-mce-only').css('visibility', 'hidden');
                setTimeout(function () {
                    floatingToolbar.addClass('hidden-mce-only').css('visibility', '');
                }, 10);
            }
            floatingToolbar.removeClass('animating-hidden');
            elWin.trigger('scroll');
        },
        blur: function (e) {
            floatingToolbar.addClass('animating-hidden');
        },
        change: function (e) {
            var self = $(e.target.bodyElement ? e.target.bodyElement : e.currentTarget);
            var currentContent = getRichContent(self);
            $('.fr-placeholder', self.closest('.tinymce-wrapper')).toggleClass('hide', !!currentContent);

            if (currentContent !== self.data('previousContent')) {
                self.data({previousContent: currentContent});
                $.proxy(compareWithPersistentContent, self, true)();
            }
        }
    };

    var defaultWysiwigEventsToChangeFormat = {
        focus: function (e) {
            if (floatingToolbar.hasClass('hidden-mce-only')) {
                floatingToolbar.removeClass('hidden-mce-only').css('visibility', 'hidden');
                setTimeout(function () {
                    floatingToolbar.addClass('hidden-mce-only').css('visibility', '');
                }, 10);
            }
            floatingToolbar.removeClass('animating-hidden');
            elWin.trigger('scroll');
        },
        blur: function (e) {
            floatingToolbar.addClass('animating-hidden');
        },
        change: function (e) {

        }
    };

    var surveyFields = {title: $('#title'), description: $('#survey-description')};
    $.each(surveyFields, function (key, el) {
        var txtarea = $('input, textarea', el).on({
            'input propertychange': function () {
                var self = $(this);
                var currentContent = self.val();
                if (currentContent !== self.data('previousContent')) {
                    clearTimeout(self.data('timeout'));
                    self.addClass('to-be-saved-for-survey');
                    self.data({
                        timeout: setTimeout($.proxy(saveSurvey, self), 5000),
                        previousContent: currentContent
                    });

                    $ws.take();
                }
            }, 'blur': function () {
                var self = $(this);
                clearTimeout(self.data('timeout'));
                setTimeout($.proxy(saveSurvey, self), 0);
            }
        });
        var currentContent = txtarea.val();
        autoReheight(txtarea.data({persistent: currentContent, previousContent: currentContent}));
    });
    if ($initErrors) {
        for (var i = 0; i < $initErrors.length; i++) {
            var err = $initErrors[i];
            if (err.objectName == 'survey') {
                $('.help-block', surveyFields[err.field].addClass('has-error')).text(err.message);
            }
        }
    }

    var questions = [];
    var containerQuestions = $('#container-questions');
    var containerQ = $('#questions');
    var navBatch = $('#nav-batch');
    var counterQuestion = $('.container-count strong:eq(0)', navBatch);
    var counterQSelective = $('.container-count strong:eq(1)', navBatch);
    var counterQSubjective = $('.container-count strong:eq(2)', navBatch);
    var counterQEvaluative = $('.container-count strong:eq(3)', navBatch);
    var counterQImage = $('.container-count strong:eq(4)', navBatch);
    var containerBatch = $('.type-tile ul', navBatch).sortable({
        animation: 200
        , handle: 'dl'
        , filter: '.profile'
        , cancel: '.shortcut'
        , onStart: function (evt) {
            var item = $(evt.item);
            if (item.has('.ui-selected').length) {
                var prev = item.prevAll().has('.ui-selected');
                var next = item.nextAll().has('.ui-selected');
                var siblings = {prev: prev.clone(true, true), next: next.clone(true, true)};
                var another = prev.last().nextAll('li:not(:has(.ui-selected))');
                another = another.length ? another : next.first().nextAll('li:not(:has(.ui-selected))');
                another.each(function () {
                    $(this).data('prev-rect', this.getBoundingClientRect());
                }).promise().done($.proxy(function (one, two, three) {
                    one.remove();
                    two.remove();
                    three.each($.proxy(function (idx, el) {
                        var self = $(el);
                        this._animate(self.data('prev-rect'), el);
                        self.removeData('prev-rect');
                    }, this));
                }, this, prev, next, another));
                item.data('selected-siblings', siblings);
            } else {
            }
            $('.ellipsis', navBatch.addClass('sorting')).popover('destroy');
        }
        , onUpdate: function () {
            setTimeout($.proxy(function () {
                $restfulAjax($apiPathPrefix.question + '/reordering', 'PUT', this.toArray()
                    , $.proxy(onSuccessSorting, function () {
                        $.proxy(renumberingQuestions, containerBatch)();
                        refreshSidebarForList();
                        busyService.end();
                    }));
            }, this), 50);

            busyService.start();
            $ws.take();
        }
        , onEnd: function (evt) {
            var item = $(evt.item);
            var siblings = item.data('selected-siblings');
            if (siblings) {
                var another = item.nextAll();
                another.each(function () {
                    $(this).data('prev-rect', this.getBoundingClientRect());
                }).promise().done($.proxy(function (one, two, three) {
                    one.before(two.prev.get().reverse());
                    one.after(two.next);
                    three.each($.proxy(function (idx, el) {
                        var self = $(el);
                        this._animate(self.data('prev-rect'), el);
                        self.removeData('prev-rect');
                    }, this));

                }, this, item, siblings, another));

                item.removeData('selected-siblings');
            }
            setTimeout($.proxy(refreshBatchPopover, $('.ellipsis', navBatch.removeClass('sorting'))), 100);
        }, onMove: function (evt) {
            var item = $(evt.dragged);
            if (!item.has('.ui-selected').length) {
                $('.ui-selected', containerBatch).removeClass('ui-selected');
                actionsSidebar.prop('disabled', true);
            }
            return !$(evt.related).children().hasClass('profile');
        }
    });

    var maxEvalLevel = 11;
    var defaultQDesc = $messages['notice.subj'];
    var imageQDesc = $messages['notice.uploadImage'];
    var barcodeQDesc = $messages['notice.scanBarcode'];
    var defaultAppendableIcon = '<i class="icon"/>';
    var removalsOnDeactive = ['.piping-setting', '.option-add-controls', '.q-settings'
        , '.q-add', '.help-block', '.option-setting', '.image-container'].join(',');

    var ENUM = {
        TYPE: {}, // 서버에서 받아와서 아래 loop문으로 셋업됩니다.
        TYPE_GROUP: {SELECTION: $messages['label.obj'], SUBJECT: $messages['label.subj'], EVALUATION: $messages['label.eval'], IMAGE: $messages['label.image'], BARCODE: $messages['label.barcode']}
        , AFTERQ: [{label: '기본', value: 0}, {label: $messages['option.gotoQuestion'], value: 1}, {label: $messages['option.endSurvey'], value: -1}]

    };
    for (var idx in $types) {
        ENUM.TYPE[$types[idx].$name] = $types[idx].$name;
    }


    var findQbyQNo = function (questionno) {
        var result = {};
        var q = parseInt(questionno, 10);

        if (isNaN(q)) {
            q = parseInt(questionno.substring(1), 10);
        }
        for (var idx in questions) {
            if (questions[idx].questionno === q) {
                result = questions[idx];
                break;
            }
        }
        result.blockednextqno = result.blockednextqno || 0;
        return result;
    };

    var getTypeGroup = function (t) {
        switch (t) {
            case ENUM.TYPE.SINGLE:
            case ENUM.TYPE.SINGLE_SCALE:
            case ENUM.TYPE.MULTIPLE:
            case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                return ENUM.TYPE_GROUP.SELECTION;
            case ENUM.TYPE.SUBJECT_NUMERIC:
            case ENUM.TYPE.SUBJECT_TEXT:
            case ENUM.TYPE.TEXT_AUTO:
            case ENUM.TYPE.SUBJECT_ADDRESS:
            case ENUM.TYPE.SUBJECT_PHONE:
            case ENUM.TYPE.SUBJECT_DATE:
                return ENUM.TYPE_GROUP.SUBJECT;
            case ENUM.TYPE.RATING:
                return ENUM.TYPE_GROUP.EVALUATION;
            case ENUM.TYPE.SINGLE_IMAGE:
                return ENUM.TYPE_GROUP.IMAGE;
            case ENUM.TYPE.BARCODE:
                return ENUM.TYPE_GROUP.BARCODE;
        }
    };

    var getDetailedType = function ($this) {
        switch ($this.type) {
            case ENUM.TYPE.SINGLE:
                return $messages['detailedType.single'];
            case ENUM.TYPE.MULTIPLE:
                return $messages['detailedType.multiple'];
            case ENUM.TYPE.SINGLE_SCALE:
                return $messages['detailedType.scale'];
            case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                return $messages['detailedType.rank'];
            case ENUM.TYPE.RATING:
                return $messages['detailedType.rating'].replace('{0}', $this.evallevel);
            case ENUM.TYPE.SUBJECT_NUMERIC:
                return $messages['detailedType.numeric'];
            case ENUM.TYPE.SUBJECT_TEXT:
                return $messages['detailedType.text'];
            case ENUM.TYPE.SUBJECT_PHONE:
                return $messages['detailedType.phone'];
            case ENUM.TYPE.SUBJECT_ADDRESS:
                return $messages['detailedType.address'];
            case ENUM.TYPE.SUBJECT_DATE:
                return $messages['detailedType.date'];
            case ENUM.TYPE.TEXT_AUTO:
                return $messages['detailedType.auto'];
            case ENUM.TYPE.SINGLE_IMAGE:
                return $messages['detailedType.image'];
            case ENUM.TYPE.BARCODE:
                return $messages['detailedType.barcode'];
            case ENUM.TYPE.NPS:
                return $messages['detailedType.nps'];
        }
    }

    var onChangeType = function () {
        if (this.checked) {
            var qContainer1 = $(this).closest('.q-container');
            var isSingle = this.value == ENUM.TYPE.SINGLE || this.value == ENUM.TYPE.SINGLE_SCALE;
            $('.options > :not(.exclusive) [name=afterOption]', qContainer1).closest('span')
                [isSingle ? 'show' : 'hide']();
            var flagEtc = $('[name=flagEtc]', qContainer1);
            var flagExclusive = $('[name=flagExclusive]', qContainer1);
            var flagRandom = $('[name=random]', qContainer1);
            if (this.value == ENUM.TYPE.SINGLE_SCALE) {
                flagEtc.iCheck('uncheck').iCheck('disable');
                flagExclusive.iCheck('uncheck').iCheck('disable');
                flagRandom.iCheck('uncheck').iCheck('disable');
            } else {
                flagEtc.iCheck('enable');
                flagExclusive.iCheck('enable');
                flagRandom.iCheck('enable');
            }
            $.proxy(onChanged, this)();

            $('[name=maxselection]', qContainer1).val(isSingle ? 1 : $('.options > li:not(.exclusive)', qContainer1).length);

            refreshSelectionCount(null, qContainer1);
            var questionno = qContainer1.parent().attr('id').slice(1, qContainer1.parent().attr('id').length)
            var getSubText = function(questionType) {
                switch (questionType) {
                    case ENUM.TYPE.SINGLE:
                        return $messages['detailedType.single'];
                    case ENUM.TYPE.MULTIPLE:
                        return $messages['detailedType.multiple'];
                    case ENUM.TYPE.SINGLE_SCALE:
                        return $messages['detailedType.scale'];
                    case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                        return $messages['detailedType.rank'];
                }
            }
            containerBatch.find('[data-id="' + questionno + '"] span').text(getSubText(this.value));
        }
    };

    var handlePrivacyCheck = function (qContainer1, checked, disabled) {
        var $isPrivacyCheckbox = qContainer1.find('input:checkbox[name="isPrivacy"]');
        var $isPrivacyLabel = $isPrivacyCheckbox.closest('.icheckbox-opensurvey-xs');

        $isPrivacyLabel.toggleClass('checked', checked);
        $isPrivacyCheckbox.prop("checked", checked);

        $isPrivacyCheckbox.attr('disabled', disabled);
        $isPrivacyLabel.toggleClass('disabled', disabled);
    }

    var onChangeSubjectType = function () {
        if (this.checked) {
            var isNumeric = this.value == ENUM.TYPE.SUBJECT_NUMERIC;
            var qContainer1 = $(this).closest('.q-container');
            $(this).closest('li').next()[isNumeric ? 'show' : 'hide']();
            $.proxy(onChanged, this)();

            var questionno = qContainer1.parent().attr('id').slice(1, qContainer1.parent().attr('id').length)
            var getSubText = function(questionType) {
                switch (questionType) {
                    case ENUM.TYPE.SUBJECT_NUMERIC:
                        handlePrivacyCheck(qContainer1, false, true);
                        return $messages['detailedType.numeric'];
                    case ENUM.TYPE.SUBJECT_TEXT:
                        handlePrivacyCheck(qContainer1, false, false);
                        return $messages['detailedType.text'];
                    case ENUM.TYPE.SUBJECT_PHONE:
                        handlePrivacyCheck(qContainer1, true, false);
                        return $messages['detailedType.phone'];
                    case ENUM.TYPE.SUBJECT_ADDRESS:
                        handlePrivacyCheck(qContainer1, true, false);
                        return $messages['detailedType.address'];
                    case ENUM.TYPE.SUBJECT_DATE:
                        handlePrivacyCheck(qContainer1, false, false);
                        return $messages['detailedType.date'];
                }
            }
            containerBatch.find('[data-id="' + questionno + '"] span').text(getSubText(this.value));
        }
    };

    var renumberingQuestions = function () {
        var items = this.children();
        var isBatch = this.closest('#nav-batch').length;

        for (var i = 0; i < items.length; i++) {
            var newNumberContainer = $('dt:first' + (isBatch ? '' : ' span'), items.eq(i)).html(i + 1);

            if (isBatch) {
                newNumberContainer.append(defaultAppendableIcon);
            }
        }
    };

    var renumberingQuestionsInLogic = function () {
        var items = this.children();
        for (var i = 0; i < items.length; i++) {
            // 응답 전 로직
            // do nothing

            // 응답 후 로직
            if (questions[i].nextquestionno > 0) {
                $('.post-logic', items.eq(i)).empty().append('<strong>' + $messages['label.afterLogic'] + ' :</strong>')
                    .append($messages['summary.gotoQuestion'].replace('{0}', questions[i].nextquestionno));
                $('[name=nextquestionno]', items.eq(i)).siblings('span').children('input').val(questions[i].nextquestionno);
            }

            // 보기 로직
            $('[name=afterOption]', items.eq(i)).siblings('span').children('input').each(function (idx, elem) {
                $(elem).val(questions[i].surveyQuestionOptionses[idx].nextquestionno);
            });

            if (!items.eq(i).hasClass('q-active')) {
                $('.options > li', items.eq(i)).each(function (idx, elem) {
                    elem = $('.input', elem);
                    elem.find('.post-option').remove();
                    $.proxy(renderPostOption, elem, questions[i].surveyQuestionOptionses[idx])();
                });
            }
        }
    };

    var drawOptions = function (options) {
        if ($.isArray(this)) {
            for (var i = 0; i < this.length; i++) {
                var liOpt = $('<li/>', {id: 'o' + this[i].optionno}).appendTo(options);
                if (this[i].rank == -1) {
                    liOpt.addClass('exclusive');
                } else if (this[i].piping) {
                    liOpt.addClass('piping').prepend('<i class="icon lock"/>');
                } else {
                    liOpt.addClass('normal');
                }

                if (this[i].etc) {
                    liOpt.addClass('etc').removeClass('normal');
                }
                setTimeout($.proxy(setupOption, liOpt, this[i]), 0);
            }
            setTimeout($.proxy(renumberingOptions, options), 0);
        }
    };
    var setupOption = function (option) {
        var content = (option && option.description) || '';
        var numberContainer = $('<span/>').addClass('number-container').appendTo(this).append(defaultAppendableIcon);
        $('<span/>').addClass('number').appendTo(numberContainer);

        if (option && option.mediaUrl) {
            $('<img/>', {src: option.mediaUrl + '?timestamp=' + new Date().getTime()}).appendTo(this);
        }

        var input = $('<div/>').addClass('input froala-view').append(content).appendTo(this);
        var qActive = this.closest('.q-active');
        if (qActive.length) {
            var newOpt1 = $.proxy(setupOptionSetting, this, option)();

            if (!this.hasClass('exclusive') && qActive.find('[name=type]:checked').val() != ENUM.TYPE.SINGLE && qActive.find('[name=type]:checked').val() != ENUM.TYPE.SINGLE_SCALE) {
                newOpt1.hide();
            }
        } else {
            input.find('.post-option').remove();
            $.proxy(renderPostOption, input, option)();
        }
    };
    var setupOptionSetting = function (option) {
        var optionSetting = $('<div/>').addClass('option-setting').appendTo(this);

        $('<a/>', {href: ''}).addClass('btn-remove-option').append(defaultAppendableIcon).click(function (e) {
            e.preventDefault();
            if (confirm($messages['confirm.deleteOption'])) {
                var self = $(this).closest('li');
                self.height(self.height());
                setTimeout($.proxy(function (additional) {
                    this.addClass('animating-hidden' + additional);
                }, self, self.index() < self.siblings().length ? '' : '-last'), 10);

                setTimeout($.proxy(function () {
                    var options = this.closest('.options');
                    setTimeout($.proxy(renumberingOptions, options), 50);

                    var wysiwyg = $('[contenteditable]', this);
                    if (wysiwyg.length) {
                        wysiwyg.tinymce().destroy();
                    }

                    var qContainer2 = options.closest('.q-container');
                    if (this.hasClass('exclusive')) {
                        $('[name=flagExclusive]', qContainer2).prop('checked', false).iCheck('update').trigger('ifCreated');
                    } else if (this.hasClass('etc')) {
                        $('[name=flagEtc]', qContainer2).prop('checked', false).iCheck('update').trigger('ifCreated');
                    }

                    this.remove();

                    refreshSelectionCount(null, qContainer2.trigger('make-saving'));
                }, self), 400);
            }
        }).appendTo(optionSetting).css('visibility', this.is('.exclusive, .piping') ? 'hidden' : '');

        var frm = $('<form/>', {method: 'post', enctype: 'multipart/form-data', target: 'hidden'})
            .addClass('btn-upload js-fileapi-wrapper').append(defaultAppendableIcon)
            .appendTo(optionSetting).css('visibility', this.is('.exclusive, .piping') ? 'hidden' : '');
        $('<input/>', {type: 'file', name: 'files', accept: 'image/png,image/jpeg,image/bmp'}).change(function () {
            if (fileValidation(FileAPI.getFiles(this)[0])) {
                var frm0 = $(this).closest('form').attr('action', $apiPathPrefix.media + '/upload');

                $returnUpload.target = frm0.closest('li');
                var id = $returnUpload.target.attr('id');

                busyService.start();
                $ws.take(300);

                $('[name=id]', frm0).val(id.substring(1));
                frm0.submit();
            }
        }).click(function () {
            var self = $(this).closest('.q-container');
            if (self.parent().hasClass('to-be-saved')) {
                self.trigger('make-saving');
            }
            $ws.take(300);
        }).appendTo(frm);
        $('<input/>', {type: 'hidden', name: 'type'}).val('OPTION').appendTo(frm);
        $('<input/>', {type: 'hidden', name: 'id'}).val(option && option.optionno ? option.optionno : '').appendTo(frm);


        var afterOptionContainer = $('<span/>').appendTo(optionSetting);
        setTimeout($.proxy(generateAfterQ,
            $('<select/>', {name: 'afterOption'}).addClass('selectpicker').appendTo(afterOptionContainer).data('width', 'auto'),
            (option && option.nextquestionno) || '', $messages['option.followQuestion'], $messages['label.gotoQuestion']), 0);

        return afterOptionContainer;
    };

    var generateOptionTextInput = function (container, optionString) {
        return $('<input/>', {
            type: 'text', name: 'description',
            placeholder: $messages['opensurvey.option' + (optionString ? optionString : '') + '.placeholder']
        }).val($.trim(container.text())).appendTo(container.empty()).on({
            'input propertychange': function () {
                $(this).closest('.q-container').trigger('make-saving', true);
            }, keydown: function (e) {
                switch (e.which) {
                    case 9:
                    case 38:
                    case 40:
                        var self = $(this);
                        var closest = self.closest('li');

                        e.preventDefault();

                        if ((e.shiftKey && e.which == 9) || e.which == 38) {
                            closest = closest.prev().find('[name=description]');

                            if (closest.length) {
                                closest.focus();
                            } else {
                                var editorQTitle = self.closest('dl').find('.q-title').tinymce();

                                if (editorQTitle) {
                                    editorQTitle.focus();
                                    editorQTitle.selection.select(editorQTitle.getBody(), true);
                                    editorQTitle.selection.collapse(false);
                                }
                            }
                        } else if ((!e.shiftKey && e.which == 9) || e.which == 40) {
                            closest = closest.next();

                            if (e.which == 9 && (!closest.length || closest.is('.etc'))) {
                                self.closest('dl').find('.btn-add-option').trigger('click');
                            } else {
                                closest.find('[name=description]').focus();
                            }
                        }
                        break;
                    case 13:
                        var btn = $('a.formatting-option').popover('show');
                        var popoverContent = $('#' + btn.attr('aria-describedby') + ' dl')
                            .addClass('clearfix').find('dd').addClass('pull-left').end();
                        popoverContent = $('<dd/>').addClass('pull-right').appendTo(popoverContent);

                        $('<button/>', {type: 'button', 'aria-label': 'Close'}).addClass('close')
                            .append($('<span/>', {'aria-hidden': 'true'}).append('&times;')).appendTo(popoverContent).click(function () {
                            $('[aria-describedby=' + $(this).closest('.popover').attr('id') + ']').popover('hide');
                        });
                        break;
                }
            }
        });
    };
    var setupOptionTextInput = function (container, optionString, target) {
        var wrapper = $('<div/>').addClass('tinymce-wrapper tinymce-selective').insertBefore(container).append(container);
        var input = generateOptionTextInput(container, optionString);
        $('<small/>').addClass('help-block').append($messages['error.blankOption']).insertAfter(container);

        if (target === undefined || (target && container.is(target.closest('.input')))) {
            setTimeout($.proxy(function () {
                this.focus();
            }, input), 20);
        }
    };

    var renumberingOptions = function () {
        var countExclusive = this.children('.exclusive').each(function (idx, el) {
            $('.number', el).html(0);
        }).length;
        var items = this.children();
        for (var i = countExclusive; i < items.length; i++) {
            $('.number', items.eq(i)).html(i - countExclusive + 1);
        }
    };

    var generatePopover = function () {
        var tmp = $('<div/>');
        if (this.hasClass('q-logic')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append($messages['notice.beforeLogic']).appendTo(dl1);
            $('<dd/>').append($('<a/>', {
                href: 'https://support.opensurvey.co.kr/ko/articles/6400372-%EB%AC%B8%ED%95%AD-%EB%A1%9C%EC%A7%81-%EC%9E%91%EC%84%B1%ED%95%98%EA%B8%B0', target: '_blank'
            }).append($messages['notice.logicGuide'])).appendTo(dl1);
        } else if (this.hasClass('selection-type')) {
            var single = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['button.single']+':').appendTo(single);
            $('<dd/>').addClass('indent').append($messages['notice.single']).appendTo(single);
            var scale = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['button.scale']+':').appendTo(scale);
            $('<dd/>').addClass('indent').append($messages['notice.scale']).appendTo(scale);
            var multi = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['button.multiple']+':').appendTo(multi);
            $('<dd/>').addClass('indent').append($messages['notice.multiple']).appendTo(multi);
            var sequential = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['button.rank']+':').appendTo(sequential);
            $('<dd/>').addClass('indent').append($messages['notice.rank']).appendTo(sequential);
        } else if (this.hasClass('subject-type')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append($messages['notice.number']).appendTo(dl1);
        } else if (this.hasClass('evaluation-type')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append($messages['notice.eval']).appendTo(dl1);
        } else if (this.hasClass('option-setting')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['checkbox.addOther']+':').appendTo(dl1);
            $('<dd/>').addClass('indent').append($messages['notice.addOther']).appendTo(dl1);
            $('<dd/>').append($messages['notice.fixLast']).appendTo(dl1);
            var dl2 = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['checkbox.addNone']+':').appendTo(dl2);
            $('<dd/>').addClass('indent').append($messages['notice.addNone']).appendTo(dl2);
            $('<dd/>').append($messages['notice.fixLast']).appendTo(dl2);
            var dl3 = $('<dl/>').appendTo(tmp);
            $('<dt/>').addClass('pull-left').append($messages['checkbox.randomize']+':').appendTo(dl3);
            $('<dd/>').addClass('indent').append($messages['notice.randomize']).appendTo(dl3);
            // $('<dd/>').append('(없음 및 기타 보기는 무작위 정렬의 영향을 받지 않습니다.)').appendTo(dl3);
        } else if (this.hasClass('formatted-option')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append($messages['notice.bulk']).appendTo(dl1);
            // $('<dd/>').append('(줄바꿈 기준으로 텍스트를 구분하여 별도의 보기를 생성합니다.)').appendTo(dl1);
        } else if (this.hasClass('formatting-option')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append($messages['notice.format']).appendTo(dl1);
        } else if (this.hasClass('piping')) {
            var dl1 = $('<dl/>').appendTo(tmp);
            $('<dd/>').append('<strong>입력된 보기</strong>를 타 문항에서 <strong>재사용</strong>할 수 있도록 할 수 있도록 해주는 기능입니다.').appendTo(dl1);
        }
        this.popover({
            container: 'body', html: true, placement: 'auto top', trigger: 'focus', content: tmp.html(), delay: {hide: 100}
        });
    };
    var initializeICheck = function () {
        this.on('ifCreated	ifChanged', function () {
            $(this).closest('label').toggleClass('unchecked', !this.checked);
        }).iCheck({checkboxClass: 'icheckbox-opensurvey-xs', radioClass: 'iradio-opensurvey-xs'});
    };
    var generateAfterQ = function (val, defaultLabel, defaultLabel2) {
        for (var i = 0; i < ENUM.AFTERQ.length; i++) {
            $('<option/>').val(ENUM.AFTERQ[i].value).append(i > 0 ? ENUM.AFTERQ[i].label : defaultLabel).appendTo(this)
                .prop('selected', (ENUM.AFTERQ[i].value * val > 0) || ENUM.AFTERQ[i].value == val);
        }
        $('<span/>').append($('<input/>', {type: 'text', name: 'gotoQ', maxlength: 3}).val(val > 0 ? val : '')
            .on({
                'input propertychange': onChanged, blur: function (e, wasTriggered) {
                    var qRanks = $.map(questions, function (item) {
                        return item.rank;
                    });
                    if (this.value && $.inArray(parseInt(this.value, 10), qRanks) < 0) {
                        this.value = '';

                        if (!wasTriggered) {
                            $notify($messages['error.invalidGoto']);
                        }
                    }
                }
            }).numeric(defaultNumericOptions))
            .append(defaultLabel2)[val > 0 ? 'show' : 'hide']().insertAfter(this);

        $.proxy(function () {
            this.selectpicker('refresh');
        }, this.change(function () {
            var isGoto = parseInt($('option:selected', this).val(), 10) > 0;
            $(this).nextAll('span:first')[isGoto ? 'show' : 'hide']().find('input').trigger(isGoto ? 'focus' : '')
                .closest('.q-container').trigger('make-saving');
        }))();
    };
    var initializeWysiwyg = function (option0, option1, wysiwyg0) {
        var initParams = {data: option1};

        if (wysiwyg0 && wysiwyg0.is(this)) {
            initParams.focus = true;
        }

        var params = {
            setup: function (editor) {
                editor.on('NodeChange', defaultWysiwigEvents.change);
                editor.on('input', defaultWysiwigEvents.change);
                //editor.on('paste', defaultWysiwigEvents.change);
                if (tinymce.Env.ie) {
                    editor.on('keydown', defaultWysiwigEvents.change);
                    editor.on('keyup', defaultWysiwigEvents.change);
                }

                editor.on('focus', defaultWysiwigEvents.focus);
                editor.on('blur', defaultWysiwigEvents.blur);

                editor.on('keydown', function (e) {
                    if (e.keyCode == 9) {
                        var li = $(e.target).closest('li');
                        var isQTitle = li.hasClass('q-active');

                        e.preventDefault();

                        if (e.shiftKey) {
                            if (!isQTitle) {
                                var prevLi = li.prev();
                                var editor2 = null;

                                if (prevLi.length) {
                                    editor2 = prevLi.find('.mce-content-body').tinymce();
                                } else {
                                    editor2 = li.closest('dl').find('.q-title').tinymce();
                                }

                                if (editor2 && editor2.bodyElement) {
                                    editor2.focus();
                                    editor2.selection.select(editor2.getBody(), true);
                                    editor2.selection.collapse(false);
                                }
                            }
                        } else {
                            var editor2 = null;

                            if (isQTitle) {
                                editor2 = li.find('.options > li:not(.piping):first, .eval-inputs > li:first');
                            } else {
                                editor2 = li.nextAll(':not(.piping):first');
                            }

                            if (editor2.length && !editor2.is('.etc')) {
                                editor2 = editor2.find('.mce-content-body').tinymce();

                                if (editor2 && editor2.bodyElement) {
                                    editor2.focus();
                                    editor2.selection.select(editor2.getBody(), true);
                                    editor2.selection.collapse(true);
                                } else {
                                    li.find('.options .input [name=description]:first').focus();
                                }
                            } else if (isQTitle || !li.hasClass('etc')) {
                                if (!isQTitle) {
                                    li = li.closest('.q-container');
                                }

                                li.find('.btn-add-option').trigger('click');
                            }
                        }
                    }
                });

                editor.on('LoadContent', function (e) {
                    // 문항 생성 후 rich 에디터에 빈칸이 생기는 걸 방지
                    var content = $(e.content);
                    if (content.length === 1 && content.html() === '&nbsp;<br>') {
                        content.html('<br>');
                        e.content = content[0].outerHTML;
                        e.element.innerHTML = content[0].outerHTML;
                    }
                });
            },
            init_instance_callback: $.proxy(function (editor) {
                this.editor = editor;
                onInitEditable(this, option0.errMsg);

                if (this.focus && !$('textarea:focus').length) {
                    setTimeout($.proxy(function () {
                        this.selection.select(this.getBody(), true);
                        this.selection.collapse(false);
                    }, editor), 100);
                }
            }, initParams)
        };
        var wrapper = $('<div/>').addClass('tinymce-wrapper ' + option1.tinymce).insertBefore(this).append(this);
        var placeholder = $('<span/>').addClass('fr-placeholder hide').append(option0.placeholder).prependTo(wrapper);
        this.tinymce($.extend(true, params, defaultTinymceOptions, option0));

        if (tinymce.Env.ie && tinymce.Env.ie < 10) {
            placeholder.click(function () {
                $(this).siblings('.mce-content-body').tinymce().focus();
            });
        }

        this.data('persistent', getRichContent(this));
    };

    var initializeWysiwygToChangeFormat = function (option0, option1, wysiwyg0) {
        var initParams = {data: option1};

        if (wysiwyg0 && wysiwyg0.is(this)) {
            initParams.focus = true;
        }

        var params = {
            setup: function (editor) {
                editor.on('NodeChange', defaultWysiwigEventsToChangeFormat.change);
                editor.on('input', defaultWysiwigEventsToChangeFormat.change);
                //editor.on('paste', defaultWysiwigEventsToChangeFormat.change);
                if (tinymce.Env.ie) {
                    editor.on('keydown', defaultWysiwigEventsToChangeFormat.change);
                    editor.on('keyup', defaultWysiwigEventsToChangeFormat.change);
                }

                editor.on('focus', defaultWysiwigEventsToChangeFormat.focus);
                editor.on('blur', defaultWysiwigEventsToChangeFormat.blur);

                editor.on('keydown', function (e) {

                });

                editor.on('LoadContent', function (e) {
                    // 문항 생성 후 rich 에디터에 빈칸이 생기는 걸 방지
                    var content = $(e.content);
                    if (content.length === 1 && content.html() === '&nbsp;<br>') {
                        content.html('<br>');
                        e.content = content[0].outerHTML;
                        e.element.innerHTML = content[0].outerHTML;
                    }
                });
            },
            init_instance_callback: $.proxy(function (editor) {
                this.editor = editor;
                onInitEditable(this, option0.errMsg);

                if (this.focus && !$('textarea:focus').length) {
                    setTimeout($.proxy(function () {
                        this.selection.select(this.getBody(), true);
                        this.selection.collapse(false);
                    }, editor), 100);
                }
            }, initParams)
        };

        var wrapper = $('<div/>').addClass('tinymce-wrapper ' + option1.tinymce).insertBefore(this).append(this);
        var placeholder = $('<span/>').addClass('fr-placeholder hide').append(option0.placeholder).prependTo(wrapper);
        this.tinymce($.extend(true, params, defaultTinymceOptionsToChangeFormat, option0));

        if (tinymce.Env.ie && tinymce.Env.ie < 10) {
            placeholder.click(function () {
                $(this).siblings('.mce-content-body').tinymce().focus();
            });
        }
        this.data('persistent', getRichContent(this));

        setTimeout(function(){
            $('.mce-open').one('click', function() {
                setTimeout(function(){
                    $('.mce-popover').on('mousedown', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    });
                },100);
            });
        },100);

    }

    setPeopleNumber($survey.answercntmax)

    var specialpremiumtext = $survey.specialpremiumtext
    if(specialpremiumtext) {
        var categories = specialpremiumtext.split('-')
        var mainCategory = $.trim(categories[0])
        var subCategory = $.trim(categories[1])

        if(Object.keys(DETAIL_TARGETING_ITEMS).indexOf(mainCategory) > -1) {
            DETAIL_TARGETING_ITEMS[mainCategory].forEach(function(category) {
                if(category.name === subCategory) setDetailTargetingUnitPrice(category.unitPrice);
            });
        } else {
            setDetailTargetingUnitPrice(-1);
        }
    }

    var genExtra = JSON.parse($survey.genExtra);
    if(genExtra && (
        (genExtra.premium_functions && genExtra.premium_functions.length > 0) ||
        (genExtra.additional_services && genExtra.additional_services.length > 0)
      )) {
        changeGenExtra(true);
    }

    var surveyTitle = $('.survey-content input', surveyFields.title);
    var surveyDescription = $('.survey-content', surveyFields.description).append($survey.description)
        .data({persistent: $survey.description, previousContent: $survey.description});
    setTimeout($.proxy(initializeWysiwyg, surveyDescription,
        {placeholder: $messages['placeholder.intro'],
            toolbar: ['bold italic underline fontsizeselect', 'alignleft aligncenter alignright alignjustify bullist'
                , 'forecolor backcolor undo redo', 'numlist indent outdent styledelement'
                , 'removeformat2 hr imagecropped table'],
            errMsg: $messages['placeholder.intro'],
            setup: function (editor) {
                var changeSurvey = function (e) {
                    defaultWysiwigEvents.change(e);
                    var self = $(this.bodyElement);
                    var currentContent = self.val();

                    if ($ws.session && !lockService.isLock) {
                        clearTimeout(self.data('timeout'));
                        self.addClass('to-be-saved-for-survey');
                        self.data({
                            timeout: setTimeout($.proxy(saveSurvey, self, true), 5000),
                            previousContent: currentContent
                        });
                        $ws.take();
                    }
                    refreshAlerts()
                };
                editor.on('NodeChange', changeSurvey);
                editor.on('input', changeSurvey);
                if (tinymce.Env.ie) {
                    editor.on('keydown', changeSurvey);
                    editor.on('keyup', changeSurvey);
                }
                editor.on('focus', function () {
                    if (floatingToolbar.hasClass('hidden-mce-only')) {
                        floatingToolbar.removeClass('hidden-mce-only').css('visibility', 'hidden');
                        setTimeout(function () {
                            floatingToolbar.addClass('hidden-mce-only').css('visibility', '');
                        }, 10);
                    }
                    floatingToolbar.removeClass('animating-hidden');
                    elWin.trigger('scroll');
                });
                editor.on('blur', function () {
                    var self = $(this.bodyElement);
                    clearTimeout(self.data('timeout'));
                    floatingToolbar.addClass('animating-hidden');
                    setTimeout($.proxy(saveSurvey, self, true), 0);
                });
                editor.on('change', refreshAlerts)
            }
        },
        {tinymce: ''}
    ), 100);

    var drawQuestion = function () {

        var li0 = $('<li/>', {id: 'q' + this.questionno}).appendTo(containerQ).addClass('heel');
        if (this.pipingtype > 0) {
            li0.addClass('piping');
        }
        if (this.fieldErrors && this.fieldErrors.length) {
            li0.addClass('q-has-error');
        }
        if (isProfile(this.questionno)) {
            li0.addClass('profile');
        }


        var qContainer = $('<div/>').addClass('q-container').appendTo(li0).click(function (e) {
            var target = $(e.target);

            if (!target.closest('.q-controls').length) {
                var currentQ = target.closest('.q-container').closest('li');
                if (!lockService.isLock && currentQ.length && !currentQ.hasClass('q-active') && !currentQ.hasClass('profile')) {
                    var previousQ = $('.q-active');
                    var deferred = $.proxy(activateQ, currentQ, previousQ, $(e.target).closest('.froala-view'));

                    if (previousQ.hasClass('to-be-saved')) {
                        clearTimeout(containerQ.data('timeout'));

                        save(function() {
                            deferred();
                            refreshSidebar();
                        });

                    } else {
                        busyService.start(true);
                        deferred();
                    }
                }
            }
        }).on({
            'make-saving': function (e, later) {
                if (!wholeScroller.hasClass('readonly')) {
                    $(this).parent().addClass('to-be-saved');
                    clearTimeout(containerQ.data('timeout'));
                    containerQ.data('timeout', setTimeout(save, later ? 10000 : 50));

                    $ws.take();
                }
            }, 'mouseenter mouseleave': function (e) {
                var qLi = $(this).parent();
                qLi.toggleClass('hover', e.type == 'mouseenter' && !qLi.hasClass('q-active'));
            }
        });


        var qControls = $('<ul/>').prependTo($('<div/>').addClass('q-controls top').prependTo(qContainer));
        $('<a/>', {href: ''}).addClass('btn-remove-q').append(defaultAppendableIcon + $messages['button.delete']).appendTo(qControls)
            .wrap('<li/>').click(function (e) {
            var $this = $(this).closest('.q-container').parent();
            var param = [parseInt($this.attr('id').substring(1), 10)];

            e.preventDefault();

            pipingService.find([param[0]]);

            if ((pipingService.ranks.length && confirm($messages['confirm.deleteQuestionPiped'].replace('{0}', pipingService.ranks.join(', ')) + '\n' + $messages['confirm.deleteQuestion']))
                || (!pipingService.ranks.length && confirm($messages['confirm.deleteQuestion']))) {
                busyService.start();

                var chain = pipingService.ranks.length ? $this.siblings(pipingService.questionno.map(function (item) {
                    return '#q' + item;
                }).join(',')).andSelf() : $this;

                $('[contenteditable]', chain).each(function () {
                    try {
                        var self = $(this);
                        self.tinymce().destroy();
                    } catch (e) {
                    }
                }).promise().always($.proxy($restfulAjax, null, $apiPathPrefix.question, 'DELETE',
                    param.concat(pipingService.questionno), $.proxy(function (r0) {
                        this.each(function () {
                            var self = $(this);
                            var target = parseInt(self.attr('id').substring(1), 10);
                            var h = self.height();
                            self.height(h);

                            for (var idx in questions) {
                                if (questions[idx].questionno == target) {
                                    questions.splice(idx, 1);
                                    break;
                                }
                            }

                            setSelectQuestionNumber(questions.length);
                        });

                        setTimeout($.proxy(function () {
                            this.addClass('animating-hidden');
                        }, this), 10);
                        setTimeout($.proxy(function (r1) {
                            this.remove();

                            $.proxy(onSuccessSorting, function () {
                                refreshSidebar();
                                busyService.end();
                            }, r1)();

                            if (!(questions.length - $profiles.length)) {
                                containerQuestions.addClass('new-survey');
                            }
                        }, this, r0), 400);

                        refreshAlerts();
                    }, chain)));
                $ws.take();
            }
        });

        if (getTypeGroup(this.type) != ENUM.TYPE_GROUP.SELECTION || !this.pipingtype) {
            $('<a/>', {href: ''}).addClass('btn-copy-q').append(defaultAppendableIcon + $messages['button.copy']).appendTo(qControls)
                .wrap('<li/>').click(function (e) {
                var $this = $(this).closest('.q-container').parent();
                e.preventDefault();
                var deferred = $.proxy(copyQuestions, null, [$this.attr('id')], function () {
                    setTimeout($.proxy(function () { this.trigger('click'); }, this), 0);
                });

                if ($('.to-be-saved').length) {
                    save(deferred);
                } else {
                    busyService.start();

                    deferred();
                }
                $ws.take();
            });
        }

        if (getTypeGroup(this.type) == ENUM.TYPE_GROUP.SELECTION) {
            var popoverContent = $('<div/>');
            var tmp = $('<dl/>').appendTo(popoverContent);
            $('<dd/>').append($messages['notice.pipe1']).appendTo(tmp);
            tmp = $('<dl/>').appendTo(popoverContent);
            $('<dd/>').append($messages['notice.pipe2']).appendTo(tmp);
            tmp = $('<dd/>').appendTo(tmp);
            tmp = $('<ul/>').appendTo(tmp);
            $('<li/>').append($messages['notice.pipe3']).appendTo(tmp);
            $('<li/>').append($messages['notice.pipe4']).appendTo(tmp);

            $('<a/>', {href: ''}).addClass('btn-piping').append(defaultAppendableIcon + $messages['button.pipe']).appendTo(qControls)
                .wrap('<li/>').click(function (e) {
                var $this = $(this).closest('.q-container').parent();
                var deferred = $.proxy(function () {
                    var copied = $.extend(true, {}, findQbyQNo(this.attr('id')));
                    var options0 = copied.surveyQuestionOptionses;
                    delete copied.fieldErrors;

                    copied.pipingtype = 1;
                    copied.pipingparentrank = copied.rank;

                    copied.random = 0;
                    copied.nextquestionno = 0;
                    copied.entrycondition = '';

                    for (var i = options0.length - 1; i >= 0; i--) {
                        if (options0[i].rank == -1) {
                            options0.splice(i, 1);
                        } else {
                            options0[i].piping = 1;
                            options0[i].nextquestionno = 0;
                            delete options0[i].fieldErrors;
                        }
                    }
                    $.proxy(doAddQ, this, copied)();
                }, $this);

                e.preventDefault();

                if ($('.to-be-saved').length) {
                    save(deferred);
                } else {
                    deferred();
                }
                $ws.take();
            }).popover({
                content: popoverContent.html(),
                delay: {show: 10, hide: 0}, html: true, placement: 'bottom', trigger: 'hover'
            });
        }

        $('<a/>', {href: ''}).addClass('btn-new-comment').append(defaultAppendableIcon + $messages['button.comment']).appendTo(qControls)
            .wrap('<li/>').click(function (e) {
            var qContainer0 = $(this).closest('.q-container');

            e.preventDefault();

            if (!qContainer0.parent().is('.q-active')) {
                busyService.start();
                qContainer0.trigger('click');
            }

            qContainer0.data('interval', setInterval($.proxy(function () {
                var commentsContainer = this.find('.comments');

                if (commentsContainer.length) {
                    clearInterval(this.data('interval'));

                    var newContainer = commentsContainer.find('.new:not(.reply)');
                    if (!newContainer.length) {
                        var li = $('<li/>').prependTo(commentsContainer);
                        this.find('.comment-container').show();
                        generateNewComment(li);
                    } else {
                        newContainer.find('textarea').focus();
                    }
                }
            }, qContainer0), 100));
        });
        $('<a/>', {href: ''}).addClass('btn-resolved-comments').append(defaultAppendableIcon + $messages['button.resolvedComment']).appendTo(qControls)
            .wrap('<li/>').click(function (e) {
            e.preventDefault();
            modalResolvedComments.data('relatedTarget', $(this).closest('.q-container').parent()).modal();
        }).parent().addClass('animating-hidden').hide();
        $('<a/>', {href: ''}).addClass('btn-preview').append(defaultAppendableIcon + $messages['button.preview']).appendTo(qControls)
            .wrap('<li/>').click(function (e) {
            var self = $(this).closest('.q-container');
            var parent = self.parent();
            e.preventDefault();

            if (parent.is('.q-active.to-be-saved')) {
                self.trigger('make-saving');
                simulator.removeClass('animating-hidden');
                btnSimulator.addClass('active');
            } else {
                simulate(findQbyQNo(parent.attr('id')).rank, false);
            }
        });


        $('<div/>').addClass('pre-logic').appendTo(qContainer);

        var dl0 = $('<dl/>').appendTo(qContainer).append('<dt><span>' + this.rank + '</span></dt>');
        var ddQTitle = $('<dd/>').appendTo(dl0);
        $('<div/>').addClass('q-title froala-view').append(this.question).appendTo(ddQTitle);

        var qSummary = $('<ul/>').addClass('q-summary').appendTo(ddQTitle);

        var qBody = $('<dd/>').addClass('q-body').appendTo(dl0);

        switch (getTypeGroup(this.type)) {
            case ENUM.TYPE_GROUP.SELECTION:
                if (this.pipingtype > 0) {
                    refreshPipingDesc(this, $('<p/>').addClass('piping-description').appendTo(qBody));
                }

                var options = $('<ol/>').addClass('options').appendTo(qBody);
                var opts = this.surveyQuestionOptionses;
                $.proxy(drawOptions, opts, options)();
                break;
            case ENUM.TYPE_GROUP.SUBJECT:
                var qDesc = $('<p/>').addClass('q-description').appendTo(qBody);
                refreshSubjectDesc(this, qDesc);

                break;
            case ENUM.TYPE_GROUP.EVALUATION:
                qBody.addClass('q-type-eval');
                $('<div/>').addClass('eval-bg').appendTo(qBody);

                var evalLevels = $('<ul/>').addClass('eval-levels').appendTo(qBody);
                Array.apply(1, new Array(maxEvalLevel)).map($.proxy(function () {
                    $('<li/>').appendTo(this);
                }, evalLevels));
                refreshEvalLevels(this.evallevel, evalLevels);

                var evalInputs = $('<ul/>').addClass('eval-inputs').appendTo(qBody);
                [this.evaltextbad, this.evaltextneutral, this.evaltextgood].map($.proxy(function (currentVal) {
                    $('<div/>').addClass('froala-view').append(currentVal).appendTo(this).wrap('<li/>');
                }, evalInputs));
                refreshEvalInputs(this.evallevel, evalInputs);
                break;
            case ENUM.TYPE_GROUP.IMAGE:
                // TODO: 이미지형 문항 처리, 일단 주관식과 동일한데 필요에 따라 다르게 처리할 예정
                var qImageDesc = $('<p/>').addClass('q-description').appendTo(qBody);
                refreshImageDesc(this, qImageDesc);
                break;
            case ENUM.TYPE_GROUP.BARCODE:
                // TODO: 이미지형 문항 처리, 일단 주관식과 동일한데 필요에 따라 다르게 처리할 예정
                var qBarcodeDesc = $('<p/>').addClass('q-description').appendTo(qBody);
                refreshBarcodeDesc(this, qBarcodeDesc);
                break;
        }

        $('<div/>').addClass('post-logic').appendTo(qContainer);


        qControls = $('<ul/>').prependTo($('<div/>').addClass('q-controls bottom').appendTo(qContainer));
        $('<a/>', {href: ''}).addClass('btn-q-add').append(defaultAppendableIcon + $messages['button.addObj']).appendTo(qControls)
            .wrap('<li/>').click(onClickQAdd).data('type', ENUM.TYPE.SINGLE);
        $('<a/>', {href: ''}).addClass('btn-q-add').append(defaultAppendableIcon + $messages['button.addSubj']).appendTo(qControls)
            .wrap('<li/>').click(onClickQAdd).data('type', ENUM.TYPE.SUBJECT_TEXT);
        $('<a/>', {href: ''}).addClass('btn-q-add').append(defaultAppendableIcon + $messages['button.addEval']).appendTo(qControls)
            .wrap('<li/>').click(onClickQAdd).data('type', ENUM.TYPE.RATING);
        if ($isAdmin) {
            $('<a/>', {href: ''}).addClass('btn-q-add').append(defaultAppendableIcon + $messages['button.addImage']).appendTo(qControls)
                .wrap('<li/>').click(onClickQAdd).data('type', ENUM.TYPE.SINGLE_IMAGE);
            $('<a/>', {href: ''}).addClass('btn-q-add').append(defaultAppendableIcon + $messages['button.addBarcode']).appendTo(qControls)
                .wrap('<li/>').click(onClickQAdd).data('type', ENUM.TYPE.BARCODE);
        }


        var commentContainer = $('<div/>').addClass('comment-container').appendTo(qContainer);
        $('<div/>').addClass('comment-count').append(defaultAppendableIcon).append('<span/>').appendTo(commentContainer);

        $restfulAjax($apiPathPrefix.question + '/' + this.questionno + '/comments', 'GET', null, $.proxy(function (r) {
            initializeComment(this.data(r.body));
            if ($(document.body).hasClass("print-with-comment")) {
                renderCommentbody(qContainer);
            }
        }, qContainer));


        refreshQSummary(this, qSummary)

        return li0;
    };

    var lastSelectedQuestionCard;
    var addQuestionBatch = function () {
        var li = $('<li/>', {'data-id': this.questionno}).addClass('col').appendTo(containerBatch);
        var dl = $('<dl/>');
        if (isProfile(this.questionno)) {
            dl.addClass('profile');
        }
        dl.appendTo(li).click(function (e) {
            if (!lockService.isLock && !$(this).hasClass('profile')) {
                var $this = $(this);
                if (e.shiftKey && $('.ui-selected', containerBatch).length) {
                    var curOrder = parseInt($('dt', $this).text());
                    var prevOrder = parseInt($('dt', lastSelectedQuestionCard).text());
                    var filtered = $('dl', containerBatch).filter(function (i) {
                        var order = i + 1;
                        return curOrder > prevOrder ? (order <= curOrder && order >= prevOrder) : (order >= curOrder && order <= prevOrder);
                    });

                    $('#btn-cancel-selecting').trigger('click');

                    filtered.toggleClass('ui-selected');
                    navBatch.toggleClass('selecting', true);
                    actionsSidebar.prop('disabled', false);
                    $('.select span:first', navBatch).html(Math.abs(curOrder - prevOrder) + 1);
                } else {
                    $this.toggleClass('ui-selected');
                    lastSelectedQuestionCard = $this;
                    var len = $('.ui-selected', containerBatch).length;
                    navBatch.toggleClass('selecting', len > 0);
                    actionsSidebar.prop('disabled', !len);
                    $('.select span:first', navBatch).html(len);
                }
            }
        });
        var appending = this.pipingtype > 0 ? ' ' + $messages['label.pipe'].replace('{0}', this.pipingparentrank) : '';

        $('<dt/>').append(this.rank).appendTo(dl);
        $('<span>' + getDetailedType(this) + appending + '</span>').appendTo(dl)
        $('<dd/>').addClass('pull-right').append(defaultAppendableIcon).appendTo(dl);
        $('<dd/>').addClass('ellipsis').text($('<p/>').html(this.question).text()).appendTo(dl).dotdotdot().popover({
            container: 'body', content: this.question, delay: {show: 0, hide: 0}, html: true, trigger: 'hover', placement: 'auto right'
        }).data('content', this.question);

        var shortcut = $('<dd/>').addClass('shortcut').appendTo(dl);
        $('<a/>', {href: ''}).append(defaultAppendableIcon).appendTo(shortcut).click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }).mousedown(function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if ($('.-container').hasClass('full-batch')) {
                $('#btn-fullscreen').trigger('click');
            }
            wholeScroll($('#q' + $(this).closest('li').data('id')));
        });
    };

    var refreshPreLogic = function (q1, preLogic) {
        var ec = $.trim(q1.entrycondition);
        var onClickBeautify = function(e) {
            e.stopPropagation();
            var $code = $(this).parent().find('.code');
            if ($code.hasClass('formatted')) {
                $code.removeClass('formatted').text(ec).parent().find('button').text('코드 펼치기');
            } else {
                var str = '<p>' + js_beautify($(this).parent().find('.code').text(), { indent_size: 2, max_preserve_newlines: 1 }).replace(/\n/g, '</p><p>').replace(/\s\s/g, '<span class="tab" />') + '</p>';
                $code.html(str).addClass('formatted').parent().find('button').text('코드 접기');
            }
        }

        if (ec) {
            preLogic.append('<strong>' + $messages['label.beforeLogic'] + ' :</strong>').append('<span class="code">' + ec + '</span>' + (q1.blockednextqno !== 0 ? '<div class="move-condition">' + (q1.blockednextqno === -1 ? $messages['summary.beforeLogicClose'] : $messages['summary.beforeLogic'].replace('{0}', q1.blockednextqno)) + '</div>' : ''));

            if ($isAdmin) {
                $('<button class="btn-opensurvey blue btn-search-and-replace">코드 펼치기</button>').addClass('beautify').appendTo(preLogic).click(onClickBeautify);
            }
        }
    };
    var refreshQSummary = function (q1, qSummary1) {
        var qContainer0 = qSummary1.empty().closest('.q-container');
        refreshPreLogic(q1, $('.pre-logic', qContainer0).empty());

        var forType = $('<li/>').appendTo(qSummary1);

        var isPrivacy = q1.isPrivacy === null ? false : q1.isPrivacy;

        if(isPrivacy){
            $('<div/>').addClass('privacy-badge').append($messages['badge.privacy']).appendTo(qSummary1);
        }

        var isActiveQ = qContainer0.parent('li').hasClass('q-active');
        qContainer0.find('.froala-view').toggleClass('has-badge', !isActiveQ && isPrivacy);

        switch (q1.type) {
            case ENUM.TYPE.SINGLE:
                forType.append($messages['summary.single']);
                break;
            case ENUM.TYPE.SINGLE_SCALE:
                forType.append($messages['summary.scale']);
                break;
            case ENUM.TYPE.MULTIPLE:
                forType.append($messages['summary.multiple'].replace('{0}', q1.minselection).replace('{1}', q1.maxselection));
                break;
            case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                forType.append($messages['summary.rank'].replace('{0}', q1.minselection).replace('{1}', q1.maxselection));
                break;
            case ENUM.TYPE.SUBJECT_TEXT:
                forType.append($messages['summary.text']);
                break;
            case ENUM.TYPE.SUBJECT_NUMERIC:
                forType.append($messages['summary.integer'].replace('{0}', q1.minval || '').replace('{1}', q1.maxval || '') + (q1.unit ? ' ' + $messages['label.unit'] + ': ' + q1.unit : ''));
                break;
            case ENUM.TYPE.RATING:
                forType.append($messages['summary.eval'].replace('{0}', q1.evallevel));
                break;
            case ENUM.TYPE.SINGLE_IMAGE:
                forType.append($messages['summary.image']);
                break;
            case ENUM.TYPE.BARCODE:
                forType.append($messages['summary.barcode']);
                break;
            case ENUM.TYPE.TEXT_AUTO:
                forType.append('<strong>주관식 자동 완성</strong>');
                break;
            case ENUM.TYPE.SUBJECT_ADDRESS:
                forType.append('<strong>주관식 주소 응답</strong>');
                break;
            case ENUM.TYPE.SUBJECT_PHONE:
                forType.append('<strong>주관식 전화번호 응답</strong>');
                break;
            case ENUM.TYPE.SUBJECT_DATE:
                forType.append('<strong>주관식 날짜 응답</strong>');
                break;
        }

        var hasExclusive = false;
        var hasEtc = false;
        for (var idx in q1.surveyQuestionOptionses) {
            if (q1.surveyQuestionOptionses[idx].rank < 0) {
                hasExclusive = true;
            } else if (q1.surveyQuestionOptionses[idx].etc) {
                hasEtc = true;
            }
        }

        if (q1.random) {
            $('<li/>').addClass('random').append('/ &nbsp; ')
                .append('<strong>' + $messages['checkbox.randomize'] + '</strong>').appendTo(qSummary1);
        }

        var postLogic = $('.post-logic', qContainer0).empty();
        if (q1.nextquestionno) {
            postLogic.append('<strong>' + $messages['label.afterLogic'] + ' :</strong>')
                .append(q1.nextquestionno < 0 ? $messages['option.endSurvey'] : q1.nextquestionno == 0 ? $messages['option.none'] : $messages['summary.gotoQuestion'].replace('{0}', q1.nextquestionno));
        }
    };
    var refreshImageDesc = function (q1, qDesc1) {
        qDesc1.text(imageQDesc);
    };
    var refreshBarcodeDesc = function (q1, qDesc1) {
        qDesc1.text(barcodeQDesc);
    };
    var refreshSubjectDesc = function (q1, qDesc1) {
        qDesc1.text(defaultQDesc);
    };
    var refreshPipingDesc = function (q1, pDesc1) {
        pDesc1.empty().append(defaultAppendableIcon)
            .append($messages['summary.pipe1'].replace('{0}', q1.pipingparentrank) + ' ')
            .append((q1.pipingtype == 2 ? $messages['option.unselected'] : $messages['option.selected']) + ' ' + $messages['summary.pipe2']);
    };


    var refreshEvalLevels = function (evallevel, evalLevels1) {
        evalLevels1.removeClass('col-3').removeClass('col-4').removeClass('col-5').removeClass('col-6').removeClass('col-7').removeClass('col-8').removeClass('col-9').removeClass('col-10').removeClass('col-11');


        evalLevels1.addClass('col-' + evallevel);

        // reset before apply
        evalLevels1.prev().removeClass('square');
        evalLevels1.removeClass('square');
        evalLevels1.parent().removeClass('square');
        evalLevels1.find("li").each(function(){
            $(this).text("");
        });

        if (evallevel >= 9) {
            evalLevels1.prev().addClass('square');
            evalLevels1.addClass('square');
            evalLevels1.parent().addClass('square');

            evalLevels1.find("li:visible").each(function(i){
                if (evallevel == 11) {
                    $(this).text(i);
                } else {
                    $(this).text(i + 1);
                }
            });
        }
    };

    var refreshEvalInputs = function(evallevel, evalInputs) {
        evalInputs.children().eq(1).removeAttr('style');
        if ([4,6,10,11].indexOf(evallevel) > -1) {
            evalInputs.children().eq(1).css('visibility', 'hidden');
        }
    };


    var refreshSelectionCount = function (q1, qContainer1) {
        var countOptions = $('.options > li:not(.exclusive)', qContainer1).length;
        var previousCountOptions = qContainer1.data('previousCountOptions');

        var selectCountMin = $('[name=minselection]', qContainer1);
        var min = parseInt(selectCountMin.val(), 10);
        var selectCountMax = $('[name=maxselection]', qContainer1);
        var max = parseInt(selectCountMax.val(), 10);

        var type0 = q1 ? q1.type : $('[name=type]:checked', qContainer1).val();
        var container = selectCountMin.closest('li')
            [countOptions && type0 != ENUM.TYPE.SINGLE && type0 != ENUM.TYPE.SINGLE_SCALE ? 'show' : 'hide']().find('span:first');

        if (type0 != ENUM.TYPE.SINGLE && type0 != ENUM.TYPE.SINGLE_SCALE) {
            container.contents().last().remove();

            switch (type0) {
                case ENUM.TYPE.MULTIPLE:
                    container.append(' ' + $messages['label.option3multiple']);
                    break;
                case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                    container.append(' ' + $messages['label.option3rank']);
                    break;
            }
        }

        if (max > countOptions || (type0 != ENUM.TYPE.SINGLE && type0 != ENUM.TYPE.SINGLE_SCALE && max == previousCountOptions)) {
            max = countOptions;
        }
        if (min > max) {
            min = max;
        }

        selectCountMin.empty();
        for (var i = 1; i <= countOptions; i++) {
            $('<option/>').val(i).append(i).appendTo(selectCountMin).prop('selected', (q1 ? q1.minselection : min) === i);
        }
        selectCountMin.selectpicker('refresh');

        selectCountMax.empty();
        for (var i = 1; i <= countOptions; i++) {
            $('<option/>').val(i).append(i).appendTo(selectCountMax).prop('selected', (q1 ? q1.maxselection : max) === i);
        }
        selectCountMax.selectpicker('refresh');

        qContainer1.data('previousCountOptions', countOptions);
    };
    var refreshSidebar = function (withoutListType) {
        var counts = {total: 0, selective: 0, subjective: 0, evaluative: 0, image: 0, barcode: 0};
        var prevScrollPosition = leftSidebar.scrollTop();
        var prevListScrollPosition = leftListSidebar.scrollTop();

        containerBatch.empty();
        $.each(questions, function (i, q) {
            setTimeout(function() {
                $.proxy(addQuestionBatch, q)();
            }, 0);

            if ($profiles.indexOf(q.questionno) !== -1) {
                return true;    // continue;
            }

            counts.total++;
            switch (getTypeGroup(q.type)) {
                case ENUM.TYPE_GROUP.SELECTION:
                    counts.selective++;
                    break;
                case ENUM.TYPE_GROUP.SUBJECT:
                    counts.subjective++;
                    break;
                case ENUM.TYPE_GROUP.EVALUATION:
                    counts.evaluative++;
                    break;
                case ENUM.TYPE_GROUP.IMAGE:
                    counts.image++;
                    break;
                case ENUM.TYPE_GROUP.BARCODE:
                    counts.barcode++;
                    break;
            }
        });
        counterQuestion.html(counts.total);
        counterQSelective.text(counts.selective);
        counterQSubjective.text(counts.subjective);
        counterQEvaluative.text(counts.evaluative);
        counterQImage.text(counts.image);
        counterQImage.text(counts.barcode);

        $('#total-question-number').text(counts.total);
        $('#selective-question-number').text(counts.selective);
        $('#subjective-question-number').text(counts.subjective);
        $('#evaluative-question-number').text(counts.evaluative);
        $('#image-question-number').text(counts.image);
        $('#barcode-question-number').text(counts.barcode);

        actionsSidebar.prop('disabled', true);
        navBatch.removeClass('selecting');
        setTimeout(function() {
            leftSidebar.scrollTop(prevScrollPosition);
            leftListSidebar.scrollTop(prevListScrollPosition);
        });

        if (!withoutListType) {
            setTimeout(function() {
                refreshSidebarForList();
            })
        }
    };
    var refreshBatchPopover = function () {
        var target = this.find('.ellipsis');
        target.popover({
            container: 'body', content: target.data('content'), delay: {show: 1000, hide: 0},
            html: true, trigger: 'hover'
        });
    };

    var renderPostOption = function (option) {
        var nextq = option ? option.nextquestionno : 0;
        if (this.is('.input') && (nextq || (option && (option.etc || option.rank == -1)))) {
            var last = this.children(':last');
            var postOption = $('<span/>').addClass('post-option');
            var prefix = '';

            if (option.rank == -1) {
                prefix = '<i class="icon special"/>' + $messages['label.none'];
            } else if (option.etc) {
                prefix = '<i class="icon special"/>' + $messages['label.other'];
            }
            postOption.append(prefix);

            if (nextq) {
                postOption.append(defaultAppendableIcon)./*append('선택 시 ').*/append(nextq > 0 ? $messages['summary.gotoQuestion'].replace('{0}', nextq) : $messages['option.endSurvey']);
            }

            if (last.length) {
                last[last.is('p') ? 'append' : 'after'](postOption);
            } else {
                this.append(postOption);
            }
        }
    };

    var renderErrors = function (container) {
        var dfd = $.Deferred();

        container = container || $('#q' + this.questionno);
        container[this.fieldErrors && this.fieldErrors.length ? 'addClass' : 'removeClass']('q-has-error');

        setTimeout($.proxy(showFirstError, container, this.fieldErrors,
            'surveyQuestion', ['question', 'surveyQuestionOptionses'], '.tinymce-q-title', 'has-error'), 0);

        switch (getTypeGroup(this.type)) {
            case ENUM.TYPE_GROUP.SELECTION:
                if (this.surveyQuestionOptionses) {
                    for (var idx in this.surveyQuestionOptionses) {
                        var option = this.surveyQuestionOptionses[idx];
                        setTimeout($.proxy(showFirstError, container, option.fieldErrors,
                            'surveyQuestionOptions', ['description'], '.options > li:eq(' + idx + ') .tinymce-selective', 'has-error'), 0);
                    }
                }
                break;
            case ENUM.TYPE_GROUP.EVALUATION:
                setTimeout($.proxy(showFirstError, container, this.fieldErrors,
                    'surveyQuestion', ['evaltextbad'], '.eval-inputs > li:eq(0) .tinymce-evaluative', 'has-error'), 0);

                if ([4,6,10,11].indexOf(this.evallevel) === -1) {
                    setTimeout($.proxy(showFirstError, container, this.fieldErrors,
                      'surveyQuestion', ['evaltextneutral'], '.eval-inputs > li:eq(1) .tinymce-evaluative', 'has-error'), 0);
                }

                setTimeout($.proxy(showFirstError, container, this.fieldErrors,
                    'surveyQuestion', ['evaltextgood'], '.eval-inputs > li:eq(2) .tinymce-evaluative', 'has-error'), 0);
                break;
            case ENUM.TYPE.SUBJECT_NUMERIC:
                setTimeout($.proxy(showFirstError, container, this.fieldErrors,
                  'surveyQuestion', ['minval'], 'input[name=minval]', 'has-error'), 0);
                setTimeout($.proxy(showFirstError, container, this.fieldErrors,
                  'surveyQuestion', ['maxval'], 'input[name=maxval]', 'has-error'), 0);
                break;
        }
        dfd.resolve();
        return dfd.promise();
    };
    var showFirstError = function (errors, objName, fieldNames, selector, errorClass) {
        var container = $(selector, this);
        var isNotError = true;
        if (errors) {
            for (var idx in errors) {
                var err = errors[idx];
                var fieldIdx = fieldNames.indexOf(err.field);
                if (err.objectName == objName && fieldIdx >= 0) {
                    if (!container.hasClass(errorClass)) {
                        var helpBlock = container.find('.help-block').text($messages['NotEmpty.' + objName + '.' + fieldNames[fieldIdx]]);
                        var h = helpBlock.height();
                        helpBlock.height(0);
                        container.addClass(errorClass);
                        helpBlock.delay(10).height(h);
                    }
                    isNotError = false;
                    break;
                }
            }
        }
        if (isNotError) {
            container.removeClass(errorClass);
        }
    };

    var isCaseSensitivity = function () {
      return  $('#modal-search-and-replace .case-sensitivity').prop('checked') ? 'g' : 'gi';
    };

    var escapeRegExp = function (string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    var countOccurrence = function (text, query) {
        return text ? (text.match(new RegExp(escapeRegExp(query), isCaseSensitivity())) || []).length : 0;
    };

    var replaceAll = function (text, from, to) {
        return text ? text.replace(new RegExp(escapeRegExp(from), isCaseSensitivity()), to) : text;
    };

    var removeTags = function (html) {
        return $('<div>' + html + '</div>').text();
    };

// 실제 nth index = (n번째 idx까지 합) + (n-1) * query.length
// ex) query = 'test', 계산된 indices = [0, 1, 6], 실제 indices = [0+0*4, (0+1)+1*4, (0+1+6)+2*4] = [0, 5, 15]
    var findIndices = function (text, query) {
        var idx = text.indexOf(query);
        if (idx === -1) {
            return [];
        } else {
            return $.merge([idx], findIndices(text.substring(idx + query.length), query));
        }
    };

    var recursiveReplace = function (contents, from, to, indices, subText) {
        var pureIter = subText === undefined;
        var result = {text: ''};
        contents.each(function () {
            if (indices.length === 0) {
                if (this instanceof Text) {
                    result.text += this.textContent;
                } else {
                    result.text += this.outerHTML;
                }
            } else {
                if (subText) {
                    if (this instanceof Text) {
                        if (subText.length + this.length === from.length) {
                            indices.splice(0, 1);
                            if (!result.pre && result.text.length === 0 && !pureIter) {
                                result.pre = subText + this.textContent;
                            } else {
                                result.text += to;
                            }
                            subText = undefined;
                        } else if (subText.length + this.length > from.length) {
                            var pos = from.length - subText.length;
                            var head = this.textContent.substring(0, pos);
                            var tail = this.textContent.substring(pos);
                            indices.splice(0, 1);
                            var ret = recursiveReplace($(document.createTextNode(tail)), from, to, indices);

                            if (!result.pre && result.text.length === 0 && !pureIter) {
                                result.pre = subText + head;
                                result.text += ret.text;
                            } else {
                                result.text += to + ret.text;
                            }
                            subText = ret.post;
                        } else {
                            subText = subText + this.textContent;
                        }
                    } else {
                        ret = recursiveReplace($(this).contents(), from, to, indices, subText);
                        if (!ret.pre) {
                            subText = ret.post;
                        }
                        if ((ret.pre ? ret.pre.length : 0) === from.length) {
                            this.innerHTML = ret.text;
                            if (!result.pre && result.text.length === 0 && !pureIter) {
                                result.pre = ret.pre;
                                result.text += this.outerHTML;
                            } else {
                                result.text += to + this.outerHTML;
                            }
                            subText = ret.post;
                        } else {
                            // error
                        }
                    }
                } else {
                    if (this instanceof Text) {
                        if (this.length <= indices[0]) {
                            result.text += this.textContent;
                            indices[0] -= this.length;
                        } else {
                            pos = indices[0] + from.length;
                            if (this.length === pos) {
                                result.text += this.textContent.substring(0, indices[0]) + to;
                                indices.splice(0, 1);
                            } else if (this.length > pos) {
                                head = this.textContent.substring(0, indices[0]);
                                tail = this.textContent.substring(pos);
                                indices.splice(0, 1);
                                ret = recursiveReplace($(document.createTextNode(tail)), from, to, indices);
                                result.text += head + to + ret.text;
                                subText = ret.post;
                            } else {
                                result.text += this.textContent.substring(0, indices[0]);
                                subText = this.textContent.substring(indices[0]);
                            }
                        }
                    } else {
                        ret = recursiveReplace($(this).contents(), from, to, indices);
                        this.innerHTML = ret.text;
                        result.text += (ret.pre ? to : '') + this.outerHTML;
                        subText = ret.post;
                    }
                }
            }
        });
        result.post = subText === '' ? undefined : subText;
        return result;
    };

    var replaceAllTagIgnored = function (html, from, to) {
        var wrappedHtml = $('<div>' + html + '</div>');
        var plainText = replaceAll(wrappedHtml.text(), from, to);
        var replacedText = recursiveReplace(wrappedHtml.contents(), from, to, findIndices(wrappedHtml.text(), from)).text;
        if (removeTags(replacedText) !== plainText) {
            return plainText;
        } else {
            return replacedText;
        }
    };

    var searchAndReplaceJob = function (from, to, includePreLogic, rangeLimit) {
        var searchOnly = to === null;
        var count = 0;

        if (!rangeLimit) {
            if (searchOnly) {
                count += countOccurrence(surveyTitle.val(), from);
                count += countOccurrence(surveyDescription.text(), from);
            } else {
                surveyTitle.val(replaceAll(surveyTitle.val(), from, to));
                surveyDescription.html(replaceAllTagIgnored(surveyDescription.html(), from, to));
            }
            if (!searchOnly) {
                setTimeout($.proxy(saveSurvey, surveyTitle), 0);
                setTimeout($.proxy(saveSurvey, surveyDescription, true), 0);
            }
        }

        for (var i in questions) {
            var q = questions[i];
            if (isProfile(q.questionno)) {
                continue;
            }
            if (!rangeLimit || q.rank >= rangeLimit.from && q.rank <= rangeLimit.to) {
                var qElem = $('#q' + q.questionno);
                var isActive = qElem.hasClass('q-active');
                if (isActive) {
                    var qTitle = $('.q-title', qElem);
                    if (searchOnly) {
                        count += countOccurrence(qTitle.text(), from);
                    } else {
                        qTitle.html(replaceAllTagIgnored(qTitle.html(), from, to));
                    }
                    $('.eval-inputs > li .froala-view', qElem).each(function () {
                        var $this = $(this);
                        if (searchOnly) {
                            count += countOccurrence($this.text(), from);
                        } else {
                            $this.html(replaceAllTagIgnored($this.html(), from, to));
                        }
                    });
                    if (includePreLogic) {
                        var entryCondition = $('[name=entrycondition]', qElem);
                        if (searchOnly) {
                            count += countOccurrence(entryCondition.val(), from);
                        } else {
                            entryCondition.val(replaceAll(entryCondition.val(), from, to));
                        }
                    }
                } else {
                    var question = q.question;
                    var evaltextbad = q.evaltextbad;
                    var evaltextneutral = q.evaltextneutral;
                    var evaltextgood = q.evaltextgood;
                    var entrycondition = q.entrycondition;
                    if (searchOnly) {
                        count += countOccurrence(removeTags(question), from);
                        count += countOccurrence(removeTags(evaltextbad), from);
                        count += countOccurrence(removeTags(evaltextneutral), from);
                        count += countOccurrence(removeTags(evaltextgood), from);
                        if (includePreLogic) {
                            count += countOccurrence(entrycondition, from);
                        }
                    } else {
                        q.question = question ? replaceAllTagIgnored(question, from, to) : q.question;
                        q.evaltextbad = evaltextbad ? replaceAllTagIgnored(evaltextbad, from, to) : q.evaltextbad;
                        q.evaltextneutral = evaltextneutral ? replaceAllTagIgnored(evaltextneutral, from, to) : q.evaltextneutral;
                        q.evaltextgood = evaltextgood ? replaceAllTagIgnored(evaltextgood, from, to) : q.evaltextgood;
                        if (includePreLogic) {
                            q.entrycondition = entrycondition ? replaceAll(entrycondition, from, to) : q.entrycondition;
                        }
                        delete q.fieldErrors;
                    }
                }
                var options = q.surveyQuestionOptionses;
                for (var j in options) {
                    if (isActive) {
                        var input = $('#o' + options[j].optionno + ' .input', qElem);
                        var input0 = input.children('input');
                        if (searchOnly) {
                            // 예전 설문에 대응하기 위해 input.text()를 남김
                            count += countOccurrence(input.text() || input0.val(), from);
                        } else {
                            // 예전 설문에 대응하기 위해 input.html() replace를 남김
                            if (input.text()) {
                                input.html(replaceAllTagIgnored(input.html(), from, to));
                            } else {
                                input0.val(replaceAllTagIgnored(input0.val(), from, to));
                            }
                        }
                    } else {
                        var description = options[j].description;
                        if (searchOnly) {
                            count += countOccurrence(removeTags(description), from);
                        } else {
                            options[j].description = description ? replaceAllTagIgnored(description, from, to) : options[j].description;
                            delete options[j].fieldErrors;
                        }
                    }
                }

                if (!searchOnly) {
                    qElem.addClass(isActive ? 'to-be-saved' : 'text-replaced to-be-saved');
                }
            }
        }
        if (searchOnly) {
            return count;
        } else {
            save();
        }
    };

    var searchAndReplaceFormattingJob = function ($from, $to, includePreLogic, rangeLimit) {
        var searchOnly = $to === null;
        var count = 0;
        var fromText = $from.text(),
            fromIsStrong = $from.find('strong').length > 0,
            fromIsItalic = $from.find('em').length > 0,
            fromUnderline = $from.html().indexOf('text-decoration') > -1 ? 'underline' : 'none',
            fromFontSize = $from.html().indexOf('font-size') > -1 ? $from.find('span, em, strong').css('font-size') : 'none',
            fromColor = $from.find('span, em, strong').length > 0 ? matchColor($from.find('span, em, strong')) : matchColor($from),
            fromBackgroundColor = $from.html().indexOf('background-color') > -1 ? $from.find('span, em, strong').css('background-color') : 'none';

        if (searchOnly) {
            if (checkNoStyle()) {
                if (planeText()) {
                    count = searchAndReplaceJob(fromText, null, includePreLogic, rangeLimit);
                    return count;
                } else if (onlyBold()) {
                    searchBoldPattern();
                } else {
                    searchNoStylePattern();
                }
            } else {
                $('.fr-tag:not(table)').each(function() {
                    var $this = $(this);
                    $this.find('span').each(function() {
                        var $this = $(this);
                        var rank = $this.closest('.q-container').parent().index();

                        if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                            var text = $this.text(),
                                isStrong = matchStrong($this),
                                isItalic = matchItalic($this),
                                underline = matchUnderline($this),
                                fontSize = matchFontSize($this),
                                color = matchColor($this),
                                backgroundColor = matchBackgroundColor($this);

                            if(matchFormatting(text, isStrong, isItalic, underline, fontSize, color, backgroundColor)) {
                                 count = count + 1;
                            }
                        }
                    });
                });
            }
        } else {
            if (checkNoStyle()) {
                if (planeText()) {
                    searchAndReplaceJob(fromText, $to.html(), includePreLogic, rangeLimit);
                    return;
                } else if (onlyBold()) {
                    replaceBoldPattern();
                } else {
                    replaceNoStylePattern();
                }
            } else {
                $('.fr-tag:not(table)').each(function() {
                    var $this = $(this);
                    $this.find('span').each(function() {
                        var $this = $(this);
                        var rank = $this.closest('.q-container').parent().index();
                        $this.closest('.q-container').parent().addClass('to-be-saved');
                        if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                            var text = $this.text(),
                                isStrong = matchStrong($this),
                                isItalic = matchItalic($this),
                                underline = matchUnderline($this),
                                fontSize = matchFontSize($this),
                                color = matchColor($this),
                                backgroundColor = matchBackgroundColor($this);

                            if (matchFormatting(text, isStrong, isItalic, underline, fontSize, color, backgroundColor)) {
                                // 바꾼다
                                if ($to.text() == '') {
                                    $this.remove();
                                } else {
                                    var toText = $to.text(),
                                        toIsStrong = $to.find('strong').length,
                                        toIsItalic = $to.find('em').length,
                                        toUnderline = $to.html().indexOf('text-decoration') > -1 ? 'underline' : 'none',
                                        toFontSize = $to.html().indexOf('font-size') > -1 ? $to.find('span, em').css('font-size') : 'none',
                                        toColor = $to.html().indexOf('color') > -1 ? $to.find('span, em').css('color') : 'none',
                                        toBackgroundColor = $to.html().indexOf('background-color') > -1 ? $to.find('span, em').css('background-color') : 'none';

                                    var html = toText;
                                    if (toIsStrong) {
                                        html = '<strong>' + html + '</strong>'
                                    }

                                    if (toIsItalic) {
                                        html = '<em>' + html + '</em>'
                                    }

                                    $this.html(html).removeAttr('data-mce-style');

                                    if (toUnderline != 'none') {
                                        $this.css('text-decoration', 'underline');
                                    }

                                    if (toFontSize != 'none') {
                                        $this.css('font-size', toFontSize);
                                    }

                                    if (toColor != 'none') {
                                        $this.css('color', toColor);
                                    }

                                    if (toBackgroundColor != 'none') {
                                        $this.css('background-color', toBackgroundColor);
                                    }
                                }
                            }
                        }
                    });
                });
            }
        }

        if (searchOnly) {
            return count;
        } else {
            // save options
            for (var i in questions) {
                var q = questions[i];
                var qElem = $('#q' + q.questionno);
                var isActive = qElem.hasClass('q-active');
                if (!isActive) {
                    q.question = qElem.find('.q-title').html();
                }

                var options = q.surveyQuestionOptionses;
                for (var j in options) {
                    var cloneOptionEl = $("#o" + options[j].optionno + " .input", qElem).clone();
                    cloneOptionEl.find(".post-option").remove();
                    options[j].description = cloneOptionEl.html();
                }

                qElem.addClass(isActive ? 'to-be-saved' : 'text-replaced to-be-saved');
            }


            save();
            if (!rangeLimit) {
                setTimeout($.proxy(saveSurvey, surveyDescription, true), 0);
            }
        }

        function matchFormatting(text, isStrong, isItalic, underline, fontSize, color, backgroundColor) {
            var matched = true;
            fromText = fromText.replace(/\u00a0/g, " ");
            text = text.replace(/\u00a0/g, " ");

            if (fromText !== text || fromIsStrong !== isStrong || fromIsItalic !== isItalic || fromUnderline !== underline || fromColor !== color || fromBackgroundColor !== backgroundColor) {
                matched = false;
            }
            return matched;
        }

        function includeRangeLimit(rank) {
            return !rangeLimit || rank + 1 >= rangeLimit.from && rank + 1<= rangeLimit.to
        }

        function matchStrong($this) {
            return  $this[0].tagName == 'STRONG' || $this.find('strong').length > 0 || $this.closest('strong').length > 0
        }

        function matchItalic($this) {
            return  $this[0].tagName == 'EM' || $this.find('em').length > 0 || $this.closest('em').length > 0
        }

        function matchUnderline($this) {
            var underline = 'none'

            if ($this.closest('.fr-tag').html().indexOf('text-decoration')) {
                isGetUnderline($this);
            }

            function isGetUnderline($dom) {
                if ($dom[0].style.textDecoration != '') {
                    underline = $dom[0].style.textDecoration;
                    return;
                } else {
                    if (!$dom.parent().hasClass('fr-tag')) {
                        isGetUnderline($dom.parent());
                    }
                }
            }

            return underline;
        }

        function matchFontSize($this) {
            var fontSize = 'none';

            if ($this.closest('.fr-tag').html().indexOf('font-size')) {
                isGetFontSize($this);
            }

            function isGetFontSize($dom) {
                if ($dom[0].style.fontSize != '') {
                    fontSize = $dom[0].style.fontSize;
                    return;
                } else {
                    if (!$dom.parent().hasClass('fr-tag')) {
                        isGetFontSize($dom.parent());
                    }
                }
            }

            return fontSize;
        }

        function matchColor($this) {
            var color = 'none';

            isGetColor($this);

            function isGetColor($dom) {
                if ($dom[0].style.color != '') {
                    color = $dom[0].style.color;
                    return;
                } else {
                    if (!$dom.hasClass('fr-tag') && !$dom.parent().hasClass('fr-tag')) {
                        isGetColor($dom.parent());
                    }
                }
            }

            return color;
        }

        function matchBackgroundColor($this) {
            var bgColor = 'none';

            if ($this.closest('.fr-tag').html().indexOf('background-color')) {
                isGetBgColor($this);
            }

            function isGetBgColor($dom) {
                if ($dom[0].style.backgroundColor != '') {
                    bgColor = $dom[0].style.backgroundColor;
                    return;
                } else {
                    if (!$dom.parent().hasClass('fr-tag')) {
                        isGetBgColor($dom.parent());
                    }
                }
            }

            return bgColor;
        }

        function planeText() {
            return checkNoStyle() && !fromIsStrong && !fromIsItalic;
        }

        function checkNoStyle() {
            return fromUnderline == 'none' && fromFontSize == 'none' && fromColor == 'none' && fromBackgroundColor == 'none';
        }

        function onlyBold() {
            return checkNoStyle() && fromIsStrong && !fromIsItalic;
        }

        function searchBoldPattern() {
            $('.fr-tag:not(table)').each(function() {
                var $this = $(this);
                  var rank = $this.closest('.q-container').parent().index();
                  if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                      $this.find('strong').each(function () {
                          var $this = $(this);
                          if ($this.closest('span').length == 0 && $this.find('span').length == 0) {
                              var text = $this.text();
                              if (text == fromText) {
                                  count = count + 1;
                              }
                          }
                      });
                  }
            });
        }

        function replaceBoldPattern() {
            $('.fr-tag:not(table)').each(function() {

                var $this = $(this);

                var rank = $this.closest('.q-container').parent().index();
                if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                    $this.find('strong').each(function () {
                        // 스타일이  있는 태그는 제외
                        var $this = $(this);
                        if ($this.closest('span').length == 0 && $this.find('span').length == 0) {
                            var text = $this.text();
                            if (text == fromText) {
                                if ($to.text() == '') {
                                    $this.remove();
                                } else {
                                    var toText = $to.text(),
                                        toIsStrong = $to.find('strong').length,
                                        toIsItalic = $to.find('em').length,
                                        toUnderline = $to.html().indexOf('text-decoration') > -1 ? 'underline' : 'none',
                                        toFontSize = $to.html().indexOf('font-size') > -1 ? $to.find('span, em').css('font-size') : 'none',
                                        toColor = $to.html().indexOf('color') > -1 ? $to.find('span, em').css('color') : 'none',
                                        toBackgroundColor = $to.html().indexOf('background-color') > -1 ? $to.find('span, em').css('background-color') : 'none';

                                    var html = toText;
                                    if (toIsStrong) {
                                        html = '<strong>' + html + '</strong>'
                                    }

                                    if (toIsItalic) {
                                        html = '<em>' + html + '</em>'
                                    }

                                    if (toUnderline != 'none' || toFontSize != 'none' || toColor != 'none' || toBackgroundColor != 'none') {
                                        $this.replaceWith('<span>' + html + '</span>');
                                    }

                                    if (toUnderline != 'none') {
                                        $this.css('text-decoration', 'underline');
                                    }

                                    if (toFontSize != 'none') {
                                        $this.css('font-size', toFontSize);
                                    }

                                    if (toColor != 'none') {
                                        $this.css('color', toColor);
                                    }

                                    if (toBackgroundColor != 'none') {
                                        $this.css('background-color', toBackgroundColor);
                                    }
                                }
                            }
                        }
                    });
                }
            });
        }

        function searchNoStylePattern() {
            $('.fr-tag:not(table)').each(function() {
                var $this = $(this);
                var rank = $this.closest('.q-container').parent().index();
                if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                    $this.find('em').each(function () {
                        var $this = $(this);
                        if ($this.closest('span').length == 0 && $this.find('span').length == 0) {
                            var text = $this.text(),
                                isStrong = matchStrong($this);
                            if (text == fromText && isStrong == fromIsStrong) {
                                count = count + 1;
                            }
                        }
                    });
                }
            });
        }

        function replaceNoStylePattern() {
            $('.fr-tag:not(table)').each(function() {
                var $this = $(this);
                var rank = $this.closest('.q-container').parent().index();

                if ($this.closest('.format-search').length == 0 && $this.closest('.format-replace').length == 0 && includeRangeLimit(rank)) {
                    $this.find('em').each(function () {
                        var $this = $(this);
                        if ($this.closest('span').length == 0 && $this.find('span').length == 0) {
                            var text = $this.text(),
                                isStrong = matchStrong($this);

                            if (text == fromText && isStrong == fromIsStrong) {
                                if ($to.text() == '') {
                                    $this.remove();
                                } else {
                                    var toText = $to.text(),
                                        toIsStrong = $to.find('strong').length,
                                        toIsItalic = $to.find('em').length,
                                        toUnderline = $to.html().indexOf('text-decoration') > -1 ? 'underline' : 'none',
                                        toFontSize = $to.html().indexOf('font-size') > -1 ? $to.find('span, em').css('font-size') : 'none',
                                        toColor = $to.html().indexOf('color') > -1 ? $to.find('span, em').css('color') : 'none',
                                        toBackgroundColor = $to.html().indexOf('background-color') > -1 ? $to.find('span, em').css('background-color') : 'none';

                                    var html = toText;

                                    if (toIsStrong) {
                                        html = '<strong>' + html + '</strong>'
                                    }

                                    if (toIsItalic) {
                                        html = '<em>' + html + '</em>'
                                    }

                                    if (toUnderline != 'none' || toFontSize != 'none' || toColor != 'none' || toBackgroundColor != 'none') {
                                        var underline = '', fontSize = '', color = '', bgColor = '';
                                        if (toUnderline != 'none') {
                                            underline = 'text-decoration:underline;';
                                        }
                                        if (toFontSize != 'none') {
                                            fontSize = 'font-size:' + toFontSize + ';';
                                        }
                                        if (toColor != 'none') {
                                            color = 'color:' + toColor + ';';
                                        }
                                        if (toBackgroundColor != 'none') {
                                            bgColor = 'background-color:' + toBackgroundColor + ';';
                                        }

                                        html = '<span style="' + underline + fontSize + color + bgColor + '">' + html + '</span>';
                                    }

                                    $this.replaceWith('<span>' + html + '</span>');
                                }
                            }
                        }
                    });
                }
            });
        }
    };

    var modalSearchAndReplace = $('#modal-search-and-replace').on('shown.bs.modal', function () {
        $('.text-search', $(this)).focus();
        $('#floating-toolbar').addClass('change-format');
        if ($('#modal-search-and-replace .limit-range').prop('checked')) {
            $('#modal-search-and-replace [name=from]').removeAttr('disabled').selectpicker('refresh');
            $('#modal-search-and-replace [name=to]').removeAttr('disabled').selectpicker('refresh');
        } else {
            $('#modal-search-and-replace [name=from]').attr('disabled', true).selectpicker('refresh');
            $('#modal-search-and-replace [name=to]').attr('disabled', true).selectpicker('refresh');
        }
    });

    $('#modal-search-and-replace').on('hidden.bs.modal', function () {
        $('#floating-toolbar').removeClass('change-format');
    });

    $('.limit-range').on('ifChecked',function() {
        $('#modal-search-and-replace [name=from]').removeAttr('disabled').selectpicker('refresh');
        $('#modal-search-and-replace [name=to]').removeAttr('disabled').selectpicker('refresh');
    });

    $('.limit-range').on('ifUnchecked',function() {
        $('#modal-search-and-replace [name=from]').attr('disabled', true).selectpicker('refresh').next().removeClass('open');
        $('#modal-search-and-replace [name=to]').attr('disabled', true).selectpicker('refresh').next().removeClass('open');

    });

    $('.change-formatting').on('ifChecked',function() {
        $('.text-search').hide();
        $('.text-replace').hide();

        $('.format-search').show();
        $('.format-replace').show();

        if ($('.text-search').val() != '') {
            var val = $('.text-search').val();
            if ($('.format-search').find('p').length == 0) {
                $('.format-search').click();
            } else {
                tinymce.execCommand('mceFocus',false,'.format-search .mce-content-body');
            }

            setTimeout(function() {
                $('.format-search').find('p').text(val);
            }, 300);
        }

        if ($('.text-replace').val() != '') {
            var val1 = $('.text-replace').val();
            $('.format-replace').text(val1);

        }
    });

    $('.change-formatting').on('ifUnchecked',function() {
        $('.text-search').show();
        $('.text-replace').show();

        $('.format-search').hide();
        $('.format-replace').hide();

        // 폼 텍스트 붙여 넣기
        if ($('.format-search').text() != '') {
            $('.text-search').val($('.format-search').text());
        }

        if ($('.format-replace').text() != '') {
            $('.text-replace').val($('.format-replace').text());
        }
    });

    $('.format-search').one('click',function() {
        setTimeout($.proxy(initializeWysiwygToChangeFormat, $(this)
            , {}, {
                tinymce: '.format-search'
            }, $(this)), 300);
    });

    $('.format-replace').one('click',function() {
        setTimeout($.proxy(initializeWysiwygToChangeFormat, $(this)
            , {}, {
                tinymce: '.format-search'
            }, $(this)), 300);
    });

    $('.btn-search-and-replace').click(function () {
        var checkedChangeFormatting = $('#modal-search-and-replace .change-formatting').prop('checked');

        if (checkedChangeFormatting) {
            var formatSearch = $('#modal-search-and-replace .format-search').find('p, h4');
            var formatReplace = $('#modal-search-and-replace .format-replace').find('p, h4');
            var from = $('#modal-search-and-replace [name=from]').val();
            var to = $('#modal-search-and-replace [name=to]').val();
            var rangeLimit = $('#modal-search-and-replace .limit-range').prop('checked') ? {
                from: from, to: to
            } : null;

            var includePreLogic = $('#modal-search-and-replace .include-pre-logic').prop('checked');

            if (formatSearch.length > 0) {
                var count = searchAndReplaceFormattingJob(formatSearch, null, includePreLogic, rangeLimit);
                if (count) {
                    $ws.take(300);
                    setTimeout(function () {
                        if (confirm($messages['replaceModal.alertSearchResult'].replace('{0}', count))) {
                            searchAndReplaceFormattingJob(formatSearch, formatReplace, includePreLogic, rangeLimit);
                            modalSearchAndReplace.modal('hide');
                        }
                    }, 0);
                    $ws.take(5);
                } else {
                    alert($messages['replaceModal.alertNoResult']);
                }
            } else {
                alert($messages['replaceModal.alertEmptyInput'])
            }
        } else {
            var textSearch = $('#modal-search-and-replace .text-search').val();
            var textReplace = $('#modal-search-and-replace .text-replace').val();
            var includePreLogic = $('#modal-search-and-replace .include-pre-logic').prop('checked');
            var from = $('#modal-search-and-replace [name=from]').val();
            var to = $('#modal-search-and-replace [name=to]').val();
            var rangeLimit = $('#modal-search-and-replace .limit-range').prop('checked') ? {
                from: from, to: to
            } : null;

            if (parseInt(from, 10) > parseInt(to, 10)) {
                $notify($messages['error.maxUnderMin']);
                $('#modal-search-and-replace [name=from]').val(parseInt(to, 10)).selectpicker('refresh');
                return;
            }

            if (textSearch) {
                var count = searchAndReplaceJob(textSearch, null, includePreLogic, rangeLimit);
                if (count) {
                    $ws.take(300);
                    setTimeout(function () {
                        if (confirm($messages['replaceModal.alertSearchResult'].replace('{0}', count))) {
                            searchAndReplaceJob(textSearch, textReplace, includePreLogic, rangeLimit);
                            modalSearchAndReplace.modal('hide');
                        }
                    }, 0);
                    $ws.take(5);
                } else {
                    alert($messages['replaceModal.alertNoResult']);
                }
            } else {
                alert($messages['replaceModal.alertEmptyInput'])
            }
        }
    });

    $('#btn-open-search-modal').click(function (e) {
        e.preventDefault();
        if (!$(this).hasClass('disabled')) {
            btnEtc.removeClass('on');
            popoverEtc.addClass('animating-hidden');

            var rangeFrom = $('[name=from]', modalSearchAndReplace);
            var valueFrom = rangeFrom.val() ? (rangeFrom.val() > questions.length ? questions.length : rangeFrom.val()) : 1;
            rangeFrom.empty();
            for (var i = 0; i < questions.length; i++) {
                $('<option/>').val(questions[i].rank).append(questions[i].rank).appendTo(rangeFrom);
            }
            rangeFrom.val(valueFrom).selectpicker('refresh');

            var rangeTo = $('[name=to]', modalSearchAndReplace);
            var valueTo = rangeTo.val() ? (rangeTo.val() > questions.length ? questions.length : rangeTo.val()) : questions.length;
            rangeTo.empty();
            for (var i = 0; i < questions.length; i++) {
                $('<option/>').val(questions[i].rank).append(questions[i].rank).appendTo(rangeTo);
            }
            rangeTo.val(valueTo).selectpicker('refresh');

            modalSearchAndReplace.modal();
        }
    });

    $('.include-pre-logic').iCheck({
        checkboxClass: 'icheckbox-opensurvey-xs'
    });

    $('.case-sensitivity').iCheck({
        checkboxClass: 'icheckbox-opensurvey-xs'
    });

    $('.limit-range').iCheck({
        checkboxClass: 'icheckbox-opensurvey-xs'
    });

    $('.change-formatting').iCheck({
        checkboxClass: 'icheckbox-opensurvey-xs',
    });

    var btnOpenSearchModal = $('#btn-open-search-modal').click(function (e) {
        e.preventDefault();
        if ($(this).hasClass('disabled')) {
            btnEtc.removeClass('on');
            popoverEtc.addClass('animating-hidden');

            var rangeFrom = $('[name=from]', modalSearchAndReplace);
            var valueFrom = rangeFrom.val() ? (rangeFrom.val() > questions.length ? questions.length : rangeFrom.val()) : 1;
            rangeFrom.empty();
            for (var i = 0; i < questions.length; i++) {
                $('<option/>').val(questions[i].rank).append(questions[i].rank).appendTo(rangeFrom);
            }
            rangeFrom.val(valueFrom).selectpicker('refresh');

            var rangeTo = $('[name=to]', modalSearchAndReplace);
            var valueTo = rangeTo.val() ? (rangeTo.val() > questions.length ? questions.length : rangeTo.val()) : questions.length;
            rangeTo.empty();
            for (var i = 0; i < questions.length; i++) {
                $('<option/>').val(questions[i].rank).append(questions[i].rank).appendTo(rangeTo);
            }
            rangeTo.val(valueTo).selectpicker('refresh');
        }
    });

    var onClickBtnEtc = function (e) {
        e.preventDefault();
        btnEtc.toggleClass('on');
        popoverEtc.toggleClass('animating-hidden');
    };
    var btnEtc = $('#btn-etc').click(onClickBtnEtc);
    var relativeParentEtc = btnEtc.closest('div');
    var popoverEtc = $('.popover', relativeParentEtc);

    $('.container-alert .popover-content, #nav-batch .overflow').mousewheelStopPropagation();
    var onClickBtnAlert = function (e) {
        e.preventDefault();
        popoverAlert.toggleClass('animating-hidden');
    };
    var btnAlert = $('#btn-alert').click(onClickBtnAlert);
    var relativeParentAlert = btnAlert.closest('div');
    var badgeAlert = $('.badge', relativeParentAlert).click(onClickBtnAlert);
    var popoverAlert = $('.popover', relativeParentAlert);
    var containerAlert = $('.popover-content', popoverAlert).mouseenter(function () {
        relativeParentAlert.tooltip('hide');
    });
    var refreshAlerts = function () {
        var hasErrors = $('.q-has-error');
        var len = hasErrors.length;
        var questionLen = len;
        if(!$('#title').val()) ++len
        if(!$('#survey-description .survey-content').text()) ++len

        // containerAlert.children(':not(.fixed)').remove();
        badgeAlert.text(len + (len > 99 ? '+' : ''));

        $('#sidebar-fix-error').children('.sidebar-left-body').children('.error-item').remove();

        if (len) {
            $('.error-count').removeClass('hide').html(len < 100 ? len : 99);
            $('.no-error-message').addClass('hide');

            if(!$('#title').val()) {
                $('<div/>').addClass('error-item').data('targetQID', idErrQ).append(
                    $messages['error.blankTitle']
                ).click(function (e) {
                    $('#title').focus()
                }).appendTo($('#sidebar-fix-error').children('.sidebar-left-body'));
            }

            if(!$('#survey-description .survey-content').text()) {
                $('<div/>').addClass('error-item').data('targetQID', idErrQ).append(
                    $messages['error.blankIntro']
                ).click(function (e) {
                    tinyMCE.get('mce_0').focus()
                }).appendTo($('#sidebar-fix-error').children('.sidebar-left-body'));
            }

            for (var i = 0; i < questionLen; i++) {
                var errQ = hasErrors.eq(i);
                var idErrQ = errQ.attr('id');
                var dataErrQ = findQbyQNo(idErrQ);
                /*$('<a/>', {href: ''}).append($('<span/>').append(dataErrQ.rank + '번 문항')).data('targetQID', idErrQ)
                    .append('에 오류가 있어 설문을 진행할 수 없습니다.').click(function (e) {
                    var targetQ = $('#' + $(this).data('targetQID') + ' .q-container');
                    e.preventDefault();

                    if (targetQ.parent().hasClass('q-active')) {
                        wholeScroll(targetQ);
                    }
                    targetQ.trigger('click');
                }).appendTo($('<li/>').addClass('list-group-item').appendTo(containerAlert));*/

                $('<div/>').addClass('error-item').data('targetQID', idErrQ).append(
                    $messages['error.blankQuestion'].replace('{0}', dataErrQ.rank)
                ).click(function (e) {
                    var targetQ = $('#' + $(this).data('targetQID') + ' .q-container');

                    if (targetQ.parent().hasClass('q-active')) {
                        wholeScroll(targetQ);
                    }
                    targetQ.trigger('click');
                }).appendTo($('#sidebar-fix-error').children('.sidebar-left-body'));
            }
            btnAlert.addClass('on');
            badgeAlert.show();
        } else {
            $('.error-count').addClass('hide');
            $('.no-error-message').removeClass('hide');
            btnAlert.removeClass('on');
            badgeAlert.hide();
            // $('<li/>').addClass('list-group-item disabled text-center').append('수정할 사항이 없습니다.').appendTo(containerAlert);
        }
    };

    var simulate = function (rank, forcedHidden) {
        $('.sidebar-button').removeClass('active')
        btnSimulator.addClass('active');
        $('.sidebar-button').trigger('classChange');

        $('iframe', simulator).remove();

        var defaultUrl = $sharingURL + '&simulator=true' + ($isAdmin ? '&isAdmin=true' : '');
        var url = rank ? defaultUrl.replace('survey-intro', 'survey').replace('form-intro', 'form') + '&previewQuestionRank=' + rank : defaultUrl;

        $('<iframe/>', {
            src: url
        }).appendTo(simulator);
    };
    var onClickSimulate = function (e) {
        e.preventDefault();

        var isActive = btnSimulator.hasClass('active');

        if(isActive) {
            simulate();
        } else {
            btnSimulator.removeClass('active');
        }
    };
    var btnSimulator = $('#sidebar-preview-button').click(onClickSimulate);
    var simulator = $('#sidebar-preview').children('.sidebar-left-body');
    $('#preview-sharing-button').click(function () {
        modalPreviewSharing.modal();
        $(this).blur();
    });
    var modalPreviewSharing = $('#modal-preview-sharing').find('input').on({
        'focus click': function () {
            var self = $(this);
            $.deselectAll();
            clearTimeout(self.data('timer'));
            self.data('timer', setTimeout($.proxy(function () {
                this.selectAll();
            }, $(this)), 50));
        },
        'copy cut': function () {
            setTimeout($.proxy(function () {
                this.addClass('hide').closest('dl').removeClass('copied');
            }, $(this).closest('dd').next().children('span').removeClass('hide').closest('dl').addClass('copied').end()), 5000);

            setTimeout(function () {
                $.deselectAll();
            }, 100);
        }
    }).end().on('show.bs.modal', function () {
        modalPreviewSharing.find('dl:first').removeClass('copied');
    });
    var clipboard = new Clipboard('#sharing-url-btn');

    $('#refresh-sharing').click(function (e, triggerParam) {
        if (triggerParam || confirm($messages['confirm.reset'])) {
            busyService.start();

            $restfulAjax($apiPathPrefix.survey + '/refresh-random-key?surveyType=' + $survey.type, 'PUT', null, function (r) {
                busyService.end();
                $sharingURL = r.body;
                modalPreviewSharing.find('input').val($sharingURL).trigger('focus');
            });
        }
    });


    var cookieNameOldMedia = 'seditor-old-media';
    if ($containsOldMedia && !Cookies.get(cookieNameOldMedia)) {
        var modalContainsOldMedia = $('#modal-contains-old-media').find('.btn-link').click(function () {
            Cookies.set(cookieNameOldMedia, true, {expires: 7});
            modalContainsOldMedia.modal('hide');
        }).end().modal();
    }


    var onSuccessSorting = function (r1) {
        var arr = r1.body;
        $setSaved(r1.savedat);

        for (var j = 0; j < arr.length; j++) {
            var q = arr[j];
            var container = $('#q' + q.questionno);

            if (j > 0) {
                container.insertAfter(containerQ.children().eq(j - 1));
            } else {
                container.prependTo(containerQ);
            }

            for (var idx in questions) {
                if (questions[idx].questionno == q.questionno) {
                    questions[idx].rank = q.rank;
                    questions[idx].nextquestionno = q.nextquestionno;
                    questions[idx].pipingparentrank = q.pipingparentrank;
                    for (var idx2 in questions[idx].surveyQuestionOptionses) {
                        questions[idx].surveyQuestionOptionses[idx2].nextquestionno = q.surveyQuestionOptionses[idx2].nextquestionno;
                    }
                }
            }

            if (q.pipingtype > 0) {
                if (container.hasClass('q-active')) {
                    $('.piping-setting span:first', container).text(q.pipingparentrank);
                } else {
                    refreshPipingDesc(q, $('.piping-description', container));
                }
            }
        }

        questions.sort(function (a, b) {
            return a.rank > b.rank ? 1 : a.rank < b.rank ? -1 : 0;
        });

        setTimeout($.proxy(renumberingQuestions, containerQ), 0);
        setTimeout($.proxy(renumberingQuestionsInLogic, containerQ), 0);
        refreshAlerts();

        try {
            this();
        } catch (ex) {
            console.error(arguments);
        }
    };

    var doAddQ = function (additional) {
        var params = $.extend(true, {}, additional.questionno ? additional : $emptyQuestion, {
            survey: {surveyno: surveyno}, rank: (questions.length ? 65535 : 1), isHtmlOption: false
        }, additional.questionno ? null : additional);

        busyService.start();

        $restfulAjax($apiPathPrefix.question + '/new', 'POST', params, $.proxy(function (r0) {
            if (!r0.success) {
                alert('최대 문항 수를 초과했습니다.');
                location.reload();
                return;
            }

            var targetQNo = this instanceof $ ? this.attr('id').substring(1) : null;
            var arrQNo = [];
            $setSaved(r0.savedat);

            if (!targetQNo) {
                questions.splice(0, 0, r0.body);
                containerQuestions.removeClass('new-survey');
            }
            for (var idx = 0; idx < questions.length; idx++) {
                var qNo = questions[idx].questionno;
                arrQNo.push(qNo);

                if (qNo == targetQNo) {
                    questions.splice(idx + 1, 0, r0.body);
                }
            }

            var newQ = $.proxy(drawQuestion, r0.body)();

            if (questions.length > 1) {
                if ($profiles.length) {
                    newQ.prependTo(containerQ);
                } else {
                    newQ.insertAfter(this);
                }
                $restfulAjax($apiPathPrefix.question + '/reordering', 'PUT', arrQNo, $.proxy(onSuccessSorting, $.proxy(function () {
                    $('.q-container', this.removeClass('heel')).trigger('click');
                    refreshSidebar();
                }, newQ)));
            } else {
                setTimeout($.proxy(function () {
                    $('.q-container', this.removeClass('heel')).trigger('click');
                    refreshSidebar();
                }, newQ), 100);
                refreshAlerts();
            }

            setSelectQuestionNumber(questions.length);
        }, this));
    };

    var onClickQAdd = function (e) {
        var $this = $(this);
        var deferred = $.proxy(doAddQ, $this.closest('.q-controls').closest('li'), {type: $this.data('type')});

        e.preventDefault();

        if ($('.to-be-saved').length) {
            save(deferred);
        } else {
            deferred();
        }
        $ws.take();
    };


    var save = function (deferred) {
        if (!wholeScroller.hasClass('busy')) {

            var saveList = $('.to-be-saved');

            if (saveList.length) {
                busyService.start();

                var arr = saveList.map(function () {
                    var $this = $(this);
                    var qData = findQbyQNo($this.attr('id').substring(1));

                    if ($this.hasClass('q-active')) {
                        qData.question = getRichContent($('.q-title', $this));
                        qData.surveyQuestionOptionses = [];
                        var options = $('.options', $this).children();
                        var defaultOpt = {surveyQuestion: {questionno: qData.questionno}};
                        var hasExclusive = options.filter('.exclusive').length;

                        var qRanks = $.map(questions, function (item) {
                            return item.rank;
                        });

                        for (var i = 0; i < options.length; i++) {
                            var opt = options.eq(i);
                            var nextq = parseInt($('[name=afterOption]', opt).val(), 10);
                            var gotoq = $('[name=gotoQ]', opt);
                            var isAvailableNextq = gotoq.closest('span').parent().is(':visible');

                            var isExclusive = opt.hasClass('exclusive');
                            var isPiping = opt.hasClass('piping');
                            var desc = '';
                            var input0 = $('.input', opt);
                            if (isPiping) {
                                desc = input0.html();
                            } else {
                                var input = input0.children('[name=description]');
                                if (input.length) {
                                    desc = $.trim(input.val());

                                    if (!!desc) {
                                        desc = '<p class="fr-tag">' + desc + '</p>';
                                    }
                                } else {
                                    desc = input0.hasClass('mce-content-body') ? getRichContent(input0) : input0.html();
                                }
                            }

                            if (isAvailableNextq && nextq > 0 && $.inArray(parseInt(gotoq.val(), 10), qRanks) < 0) {
                                gotoq.val('');
                            }

                            var img = $('.image-container', opt);
                            var imgCropper = $('.crop-container img:first', img);
                            var newOpt = $.extend(true, {}, defaultOpt, {
                                rank: isExclusive ? -1 : i + (hasExclusive ? 0 : 1), description: desc,
                                nextquestionno: isAvailableNextq && nextq != 0 ? (nextq > 0 ? (gotoq.val() || 0) : nextq) : 0,
                                etc: opt.hasClass('etc') ? 1 : 0, piping: isPiping ? 1 : 0,
                                mediaUrl: img.length ? img.data('filenameOrigin') : null,
                                imageCropperData: imgCropper.length ? JSON.stringify(imgCropper.cropper('getData')) : null,
                                imageCropperCanvasData: imgCropper.length ? JSON.stringify(imgCropper.cropper('getCanvasData')) : null
                            });

                            if (opt.is('[id]')) {
                                newOpt.optionno = parseInt(opt.attr('id').substring(1), 10);
                            }

                            qData.surveyQuestionOptionses.push(newOpt);
                        }

                        var evalInputs = $('.eval-inputs', $this).children();
                        if (evalInputs.length) {
                            qData.evaltextbad = getRichContent(evalInputs.eq(0).find('.mce-content-body'));
                            qData.evaltextneutral = getRichContent(evalInputs.eq(1).find('.mce-content-body'));
                            qData.evaltextgood = getRichContent(evalInputs.eq(2).find('.mce-content-body'));
                        }

                        var inputs = $('[name=entrycondition], :radio:checked, :checkbox, select:not([name=afterOption]), :text:not([name=gotoQ], [name=minselection], [name=maxselection], [name=minval], [name=maxval])', $this);
                        for (var i = 0; i < inputs.length; i++) {
                            var input = inputs.eq(i);
                            var fieldName = input.attr('name');
                            if (fieldName) {
                                var v = input.val();
                                v = isNaN(v) ? $.trim(v) : parseInt(v, 10);

                                switch (fieldName) {
                                    case 'random':
                                        qData[fieldName] = input.prop('checked') ? 1 : 0;
                                        break;
                                    case 'isHtmlOption': case 'isPrivacy':
                                        qData[fieldName] = input.prop('checked');
                                        break;
                                    case 'nextquestionno':
                                        var gotoq = $(':text', input.nextAll('span:first'));
                                        if (v > 0 && $.inArray(parseInt(gotoq.val(), 10), qRanks) < 0) {
                                            gotoq.val('');
                                        }
                                        qData[fieldName] = v > 0 ? gotoq.val() : v;
                                        break;
                                    case 'type':
                                        qData[fieldName] = input.prop('checked') ? v : qData[fieldName];

                                        switch (qData.type) {
                                            case ENUM.TYPE.MULTIPLE:
                                            case ENUM.TYPE.MULTIPLE_SEQUENTIAL:
                                                qData.minselection = $('[name=minselection]', $this).val();
                                                qData.maxselection = $('[name=maxselection]', $this).val();
                                                break;
                                            case ENUM.TYPE.SUBJECT_NUMERIC:
                                                qData.minval = $('[name=minval]', $this).val();
                                                qData.maxval = $('[name=maxval]', $this).val();
                                                qData.unit = $('[name=unit]', $this).val();
                                                break;
                                        }
                                        break;
                                    default:
                                        qData[fieldName] = v;
                                }
                            }
                        }

                        if (!qData.pipingtype) {
                            qData.pipingtype = 0;
                        }
                    }
                    delete qData.fieldErrors;
                    return qData;
                }).get();

                $restfulAjax($apiPathPrefix.survey + '/questions', 'PUT', arr, $.proxy(function (r) {
                    var needRefreshSidebar = false;

                    $setSaved(r.savedat);

                    r = r.body;
                    for (var idx in r) {
                        var modified = r[idx];
                        var container = $('#q' + modified.questionno).removeClass('to-be-saved');
                        var isActive = container.hasClass('q-active');

                        refreshQSummary(r[idx], $("#q" + r[idx].questionno + " .q-container dl dd .q-summary"));

                        var qTitle0 = $('.q-title', container);
                        if (qTitle0.data('persistent') != modified.question) {
                            needRefreshSidebar = true;
                        }
                        qTitle0.data('persistent', modified.question);

                        var containerOptions = $('.options', container);
                        var options = containerOptions.children();
                        if (isActive) {
                            for (var idx in modified.surveyQuestionOptionses) {
                                var opt = modified.surveyQuestionOptionses[idx];
                                $('.input', options.eq(idx).attr('id', 'o' + opt.optionno)).data('persistent', opt.description);
                            }

                            if (btnSimulator.hasClass('active')) {
                                simulate(modified.rank, false);
                            }
                        } else {
                            $.proxy(drawOptions, modified.surveyQuestionOptionses, containerOptions.empty())();
                        }

                        var evalInputs = $('.eval-inputs', container).children();
                        var evalInputTextBad, evalInputTextNeutral, evalInputTextGood;
                        if (evalInputs.length) {
                            evalInputTextBad = evalInputs.eq(0).children();
                            evalInputTextNeutral = evalInputs.eq(1).children();
                            evalInputTextGood = evalInputs.eq(2).children();
                            evalInputTextBad.data('persistent', modified.evaltextbad);
                            evalInputTextNeutral.data('persistent', modified.evaltextneutral);
                            evalInputTextGood.data('persistent', modified.evaltextgood);
                        }

                        $.proxy(renderErrors, modified, container)();

                        for (var i in questions) {
                            if (questions[i].questionno == modified.questionno) {
                                questions[i] = modified;
                                break;
                            }
                        }

                        // 찾아 바꾸기로 바꾼 경우
                        if (container.hasClass('text-replaced')) {
                            container.removeClass('text-replaced');
                            qTitle0.html(qTitle0.data('persistent'));

                            // q-active가 아닌경우 options의 요소를 지우고 새로만들기 때문에 값을 직접 바꿀 필요가 없다

                            if (evalInputs.length) {
                                evalInputTextBad.html(evalInputTextBad.data('persistent'));
                                evalInputTextNeutral.html(evalInputTextNeutral.data('persistent'));
                                evalInputTextGood.html(evalInputTextGood.data('persistent'));
                            }

                            refreshPreLogic(modified, $('.pre-logic', container).empty());
                        }
                    }
                    refreshAlerts();

                    if (typeof(this) == 'function') {
                        this();
                    } else {
                        if (needRefreshSidebar) {
                            refreshSidebar(true);
                        }
                        refreshSidebarForList();
                    }
                }, deferred), function () {
                    // console.debug(arguments);
                }).always(function () {
                    busyService.end();
                });
            }
        }
    };

    var matchSidebarPositionToWindow = function(response) {
        $.each(response, function(index, q) {
            var questionElement = $("li#q" + q.questionno);
            if (questionElement.offset().top - elWin.scrollTop() >= 150) {
                leftListSidebar.animate(
                    {
                        scrollTop: $("#left-sidebar-list [data-id=" + q.questionno + "]").position().top - 168
                    }
                )
                leftSidebar.animate(
                    {
                        scrollTop: $("#left-sidebar-tile [data-id=" + q.questionno + "]").position().top - 168
                    }
                )
                return false;
            }
        })
    }


    var activateQ = function (previous, wysiwyg0) {
        var activate = $.proxy(function (wysiwyg) {
            floatingToolbar.removeClass('animating-hidden');
            var q = findQbyQNo(this.attr('id'));

            if (getTypeGroup(q.type) === ENUM.TYPE_GROUP.SUBJECT) {
                $('.q-description', this).text(defaultQDesc);
            } else if (getTypeGroup(q.type) === ENUM.TYPE_GROUP.IMAGE) {
                $('.q-description', this).text(imageQDesc);
            } else if (getTypeGroup(q.type) === ENUM.TYPE_GROUP.BARCODE) {
                $('.q-description', this).text(barcodeQDesc);
            }
            this.addClass('q-active');
            this.find('.froala-view').removeClass('has-badge');
            wholeScroll(this, 100);


            var qContainer0 = $('.q-container', this).data('longInitializingElementsCount', 1);
            var qTitle0 = $('.q-title', qContainer0);
            setTimeout($.proxy(initializeWysiwyg, qTitle0
                , {
                    placeholder: $messages['placeholder.question'], forced_root_block: 'H4',
                    plugins: [defaultTinymceOptions.plugins + ' imagecropped']
                }, {
                    tinymce: 'tinymce-q-title'
                }, wysiwyg.length ? wysiwyg : qTitle0), 300);

            var dl0 = $('dl:not([class]):first', qContainer0);

            var qBody = $('.q-body', this);

            switch (getTypeGroup(q.type)) {
                case ENUM.TYPE_GROUP.SELECTION:
                    if (q.pipingtype > 0) {
                        var pipingSetting = $('<p/>').addClass('piping-setting').append(defaultAppendableIcon).prependTo(qBody)
                            .append($messages['summary.pipe1'].replace('{0}', q.pipingparentrank) + ' ');

                        var pipingTypeSelect = $('<select/>', {name: 'pipingtype'}).addClass('selectpicker')
                            .appendTo(pipingSetting).data('width', 'auto').change(onChanged);

                        $('<option/>').val(1).append($messages['option.selected']).appendTo(pipingTypeSelect).prop('selected', q.pipingtype === 1);
                        $('<option/>').val(2).append($messages['option.unselected']).appendTo(pipingTypeSelect).prop('selected', q.pipingtype === 2);

                        pipingTypeSelect.selectpicker('refresh');
                        pipingSetting.append(' ' + $messages['summary.pipe2']);
                    }

                    $('.options > li', qContainer0).each($.proxy(function (idx, el) {
                        el = $(el);
                        var qContainer3 = el.closest('.q-container');
                        var isPiping = el.is('.piping');

                        el.find('.post-option').remove();

                        if (!isPiping) {
                            var optionString = el.is('.etc') ? '.etc' : (el.is('.exclusive') ? '.exclusive' : '');
                            var container = $('.input', el);

                            if (q.isHtmlOption === null || !!q.isHtmlOption) {
                                setTimeout($.proxy(initializeWysiwyg, container
                                    , {placeholder: $messages['opensurvey.option' + optionString + '.placeholder']}
                                    , {
                                        tinymce: 'tinymce-selective'
                                    }, this), 400);

                                var count = qContainer3.data('longInitializingElementsCount') || 0;
                                qContainer3.data('longInitializingElementsCount', ++count);
                            } else {
                                setupOptionTextInput(container, optionString, this);
                            }
                        }

                        var qData0 = findQbyQNo(qContainer3.parent().attr('id'));
                        var option = $.proxy(function (optno) {
                            for (var i in this.surveyQuestionOptionses) {
                                if (optno == this.surveyQuestionOptionses[i].optionno) {
                                    return this.surveyQuestionOptionses[i];
                                }
                            }
                        }, qData0, el.attr('id').substring(1))();

                        var newAfterOptionContainer = $.proxy(setupOptionSetting, el, option)();

                        if (qData0.type != ENUM.TYPE.SINGLE && qData0.type != ENUM.TYPE.SINGLE_SCALE && option.rank > 0) {
                            newAfterOptionContainer.hide();
                        }

                        if (option.mediaUrl) {
                            generateUploadOptionImage(getArchivedUrlFromCropped(option.mediaUrl), el, option);

                            if (!isPiping) {
                                var count = qContainer3.data('longInitializingElementsCount') || 0;
                                qContainer3.data('longInitializingElementsCount', ++count);
                            }
                        }

                    }, wysiwyg)).children('img').remove();


                    var optionAddControls = $('<div/>').addClass('option-add-controls').appendTo(qBody);

                    if (!q.pipingtype) {
                        $('<a/>', {href: ''}).addClass('btn-add-option').append(defaultAppendableIcon)
                            .append($messages['button.addOption']).appendTo(optionAddControls).click(function (e) {
                            var qContainer1 = $(this).closest('.q-container');
                            var container = $('.options', qContainer1);
                            var etc = $('.etc', container);
                            var noOption = container.children().length == 0;
                            var liOpt1 = $('<li/>').addClass('normal')[etc.length ? 'insertBefore' : 'appendTo'](etc.length ? etc : container);

                            e.preventDefault();

                            $.proxy(setupOption, liOpt1, null)();

                            var input1 = $('.input', liOpt1);

                            if ($('[name=isHtmlOption]', qContainer1).prop('checked')) {
                                setTimeout($.proxy(initializeWysiwyg, input1
                                    , {placeholder: $messages['placeholder.option']}
                                    , {
                                        tinymce: 'tinymce-selective'
                                    }, input1), 100);
                            } else {
                                setupOptionTextInput(input1);
                            }

                            setTimeout($.proxy(renumberingOptions, container), 0);
                            refreshSelectionCount(null, qContainer1.trigger('make-saving', true));

                            if (noOption) {
                                $('[name=minselection], [name=maxselection]', qContainer1).val(1).selectpicker('refresh');
                            }
                        });

                        var btnAddOptionBatch = $('<span/>').addClass('btn-add-option-batch').appendTo(optionAddControls);
                        var appendableText = q.isHtmlOption ? $messages['button.bulkInsert'] : $messages['button.bulkEdit'];
                        $('<a/>', {href: ''}).append(defaultAppendableIcon).append(appendableText).click(function (e) {
                            e.preventDefault();
                            setTimeout(function () {
                                formattedOptions.focus();
                            }, 500);

                            formattedOptions.val('');
                            var options = $(this).closest(".q-body").find(".options input[name='description']");
                            var count = 0;
                            options.each(function(){
                                formattedOptions.val(formattedOptions.val() + $(this).val());
                                count++;
                                if (count < options.length) {
                                    formattedOptions.val(formattedOptions.val() + "\n");
                                }
                            });
                            placeholder_formattedOptions[formattedOptions.val() ? 'hide' : 'show']();
                            if ($("input[name=isHtmlOption]:checked").val()) {
                                modal_formattedOptions.find("dt").html("<dt><i class='icon'></i>" + $messages['button.bulkInsert'] + "<small>" + $messages['notice.bulkInsert'] + "</small></dt>");
                            } else {
                                modal_formattedOptions.find("dt").html("<dt><i class='icon'></i>" + $messages['button.bulkEdit'] + "<small>" + $messages['notice.bulkEdit'] + "</small></dt>");
                            }

                            modal_formattedOptions.modal();
                        }).appendTo(btnAddOptionBatch);
                        setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                            .addClass('icon help formatted-option').appendTo(btnAddOptionBatch)), 0);
                    }


                    var qSettingsForThisType = $('<ul/>').addClass('q-settings').appendTo(dl0);
                    var li1 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl1 = $('<dl/>').appendTo(li1);
                    var dt1 = $('<dt/>').append($messages['label.answerType']).appendTo(dl1);
                    setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                        .addClass('icon help selection-type').appendTo(dt1)), 0);

                    var dd1 = $('<dd/>').appendTo(dl1);
                    var selectionType = $('<div/>', {'data-toggle': 'buttons'}).addClass('btn-group selection-type').appendTo(dd1);

                    var bool = q.type == ENUM.TYPE.SINGLE;
                    var single = $('<label/>').addClass('btn btn-default').append($messages['button.single']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(single).change(onChangeType)
                        .val(ENUM.TYPE.SINGLE).prop('checked', bool).attr('autocomplete', 'off');
                    single.addClass(bool ? 'active' : '');

                    bool = q.type == ENUM.TYPE.SINGLE_SCALE;
                    var scale = $('<label/>').addClass('btn btn-default').append($messages['button.scale']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(scale).change(onChangeType)
                        .val(ENUM.TYPE.SINGLE_SCALE).prop('checked', bool).attr('autocomplete', 'off');
                    scale.addClass(bool ? 'active' : '');

                    bool = q.type == ENUM.TYPE.MULTIPLE;
                    var multi = $('<label/>').addClass('btn btn-default').append($messages['button.multiple']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(multi).change(onChangeType)
                        .val(ENUM.TYPE.MULTIPLE).prop('checked', bool).attr('autocomplete', 'off');
                    multi.addClass(bool ? 'active' : '');

                    bool = q.type == ENUM.TYPE.MULTIPLE_SEQUENTIAL;
                    var sequential = $('<label/>').addClass('btn btn-default').append($messages['button.rank']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(sequential).change(onChangeType)
                        .val(ENUM.TYPE.MULTIPLE_SEQUENTIAL).prop('checked', bool).attr('autocomplete', 'off');
                    sequential.addClass(bool ? 'active' : '');

                    var li5 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl5 = $('<dl/>').appendTo(li5);
                    var dt5 = $('<dt/>').appendTo(dl5);
                    var dd5 = $('<dd/>').appendTo(dl5);

                    var span = $('<span/>').appendTo(dd5);
                    span.append($messages['label.option1multiple']);
                    $('<select/>', {name: 'minselection'}).addClass('selectpicker').appendTo(span)
                        .data('width', 'auto').change(function () {
                        var $this = $(this);
                        var opposite = parseInt($this.siblings('[name=maxselection]').val(), 10);

                        if (parseInt($this.val(), 10) > opposite) {
                            $notify($messages['error.minOverMax']);
                            $this.val(opposite).selectpicker('refresh');
                        } else {
                            $.proxy(onChanged, this)();
                        }
                    });
                    span.append(' ' + $messages['label.option2']);
                    $('<select/>', {name: 'maxselection'}).addClass('selectpicker').appendTo(span)
                        .data('width', 'auto').change(function () {
                        var $this = $(this);
                        var opposite = parseInt($this.siblings('[name=minselection]').val(), 10);

                        if (parseInt($this.val(), 10) < opposite) {
                            $notify($messages['error.maxUnderMin']);
                            $this.val(opposite).selectpicker('refresh');
                        } else {
                            $.proxy(onChanged, this)();
                        }
                    });
                    span.append(' ' + $messages['label.option3multiple']);
                    refreshSelectionCount(q, qContainer0);


                    var li2 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl2 = $('<dl/>').appendTo(li2);
                    var dt2 = $('<dt/>').append($messages['label.optionSetting']).appendTo(dl2);
                    setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                        .addClass('icon help option-setting').appendTo(dt2)), 0);

                    var dd2 = $('<dd/>').appendTo(dl2);

                    var flagEtc = $('<label/>').append($messages['checkbox.addOther']).appendTo(dd2);
                    var currentEtc = q.surveyQuestionOptionses.filter(function (q) {return q.etc == 1;});
                    setTimeout($.proxy(initializeICheck, $('<input/>', {type: 'checkbox', name: 'flagEtc'})
                        .prependTo(flagEtc).prop({
                            checked: currentEtc.length > 0, disabled: q.type == ENUM.TYPE.SINGLE_SCALE || currentEtc.length > 0 && currentEtc[0].piping == 1
                        }).on('ifChanged', function () {
                            var qContainer1 = $(this).closest('.q-container');
                            var container = $('.options', qContainer1);
                            var exist = $('.etc', container);
                            if (this.checked) {
                                if (exist.length == 0) {
                                    exist = $('<li/>').addClass('etc').appendTo(container);
                                    $.proxy(setupOption, exist, {description: '<p class="fr-tag">' + $messages['placeholder.other'] + '</p>'})();
                                    exist = $('.input', exist);

                                    if ($('[name=isHtmlOption]', qContainer1).prop('checked')) {
                                        setTimeout($.proxy(initializeWysiwyg, exist
                                            , {placeholder: $messages['placeholder.noneOption']}
                                            , {
                                                tinymce: 'tinymce-selective'
                                            }, exist), 100);
                                    } else {
                                        setupOptionTextInput(exist, '.etc');
                                    }
                                }
                            } else {
                                var optionInput = $('.input[contenteditable]', exist);
                                if (optionInput.length) {
                                    optionInput.tinymce().destroy();
                                }
                                exist.remove();
                            }
                            setTimeout($.proxy(renumberingOptions, container), 0);
                            refreshSelectionCount(null, qContainer1.trigger('make-saving'));
                        })), 0);

                    var flagExclusive = $('<label/>').append($messages['checkbox.addNone']).appendTo(dd2);
                    setTimeout($.proxy(initializeICheck, $('<input/>', {type: 'checkbox', name: 'flagExclusive'})
                        .prependTo(flagExclusive).prop({
                            checked: $('.exclusive', qBody).length > 0, disabled: q.type == ENUM.TYPE.SINGLE_SCALE
                        }).on('ifChanged', function () {
                            var qContainer1 = $(this).closest('.q-container');
                            var container = $('.options', qContainer1);
                            var exist = $('.exclusive', container);
                            if (this.checked) {
                                if (exist.length == 0) {
                                    var liOpt1 = $('<li/>').addClass('exclusive').prependTo(container);
                                    $.proxy(setupOption, liOpt1, {description: '<p class="fr-tag">' + $messages['placeholder.none'] + '</p>'})();

                                    var input1 = $('.input', liOpt1);

                                    if ($('[name=isHtmlOption]', qContainer1).prop('checked')) {
                                        setTimeout($.proxy(initializeWysiwyg, input1
                                            , {placeholder: $messages['placeholder.noneOption']}
                                            , {
                                                tinymce: 'tinymce-selective'
                                            }, input1), 100);
                                    } else {
                                        setupOptionTextInput(input1, '.exclusive');
                                    }
                                }
                            } else {
                                var optionInput = $('.input[contenteditable]', exist);
                                if (optionInput.length) {
                                    optionInput.tinymce().destroy();
                                }
                                exist.remove();
                            }
                            setTimeout($.proxy(renumberingOptions, container), 0);
                            qContainer1.trigger('make-saving');
                        })), 0);

                    var flagRandom = $('<label/>').append($messages['checkbox.randomize']).appendTo(dd2);
                    setTimeout($.proxy(initializeICheck, $('<input/>', {type: 'checkbox', name: 'random'})
                        .prependTo(flagRandom).prop({
                            checked: q.random, disabled: q.type == ENUM.TYPE.SINGLE_SCALE
                        }).on('ifChanged', onChanged)), 0);

                    var flagHtmlOption = $('<label/>').addClass('formatting-option').append($messages['checkbox.format']).appendTo(dd2);
                    setTimeout($.proxy(initializeICheck, $('<input/>', {type: 'checkbox', name: 'isHtmlOption'})
                        .prependTo(flagHtmlOption).prop('checked', q.isHtmlOption === null || !!q.isHtmlOption)
                        .on('ifChanged', onChanged).on('ifChanged', function () {
                            busyService.start(true);
                            if ($(this).prop("checked")) {
                                $(".q-active .btn-add-option-batch a").each(function() {
                                    if ($(this).find("i").length > 0) {
                                        $(this).html("<i class='icon'></i>" + $messages['button.bulkInsert']);
                                    }
                                });
                            } else {
                                $(".q-active .btn-add-option-batch a").each(function() {
                                    if ($(this).find("i").length > 0) {
                                        $(this).html("<i class='icon'></i>" + $messages['button.bulkEdit']);
                                    }
                                });
                            }
                            var wysiwygs = $(this).closest('.q-container').find('.options > :not(.piping)');
                            var remainingCount = wysiwygs.length;

                            if (remainingCount) {
                                wysiwygs.each($.proxy(function (idx, el) {
                                    try {
                                        setTimeout($.proxy(function (isHtml) {
                                            var optionString = this.is('.etc') ? '.etc' : (this.is('.exclusive') ? '.exclusive' : '');
                                            var container = $('.input', this);
                                            var input = container.children('[name=description]');

                                            if (isHtml) {
                                                if (input.length) {
                                                    container.html('<p class="fr-tag">' + input.val() + '</p>');
                                                }

                                                container.closest('.tinymce-wrapper').before(container).remove();

                                                $.proxy(initializeWysiwyg, container
                                                    , {placeholder: $messages['opensurvey.option' + optionString + '.placeholder']}
                                                    , {
                                                        tinymce: 'tinymce-selective'
                                                    })();
                                            } else if (!input.length) {
                                                container.tinymce().destroy();
                                                $('.fr-placeholder', this).remove();

                                                generateOptionTextInput(container, optionString);
                                            }

                                            if (--remainingCount == 0) {
                                                busyService.end();

                                                $.proxy(renderErrors, findQbyQNo(this.closest('.q-container').parent().attr('id')))();
                                            }
                                        }, $(el), this.checked), 0);
                                    } catch (e) {
                                    }
                                }, this));
                            }

                            $(this).closest('.q-container').find('.options > :not(.piping) > .input').each($.proxy(function (idx, el) {
                                var self = $(el);
                                var input = self.children('[name=description]');

                                if (this.checked) {

                                } else if (!input.length) {
                                    self.tinymce().destroy();
                                }
                            }, this));
                        })), 0);

                    setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                        .addClass('icon help formatting-option').appendTo(dd2)), 0);

                    $('.options', qBody).sortable({
                        animation: 200, handle: '.number-container', draggable: '.normal',
                        onStart: function (evt) {
                            $(evt.item).closest('.options').addClass('sorting');
                        }, onUpdate: function () {
                            var container = $(this.el);
                            container.closest('.q-container').trigger('make-saving');
                            setTimeout($.proxy(renumberingOptions, container), 0);
                        }, onEnd: function (evt) {
                            $(evt.item).closest('.options').removeClass('sorting');
                        }
                    });

                    break;
                case ENUM.TYPE_GROUP.SUBJECT:
                    var qSettingsForThisType = $('<ul/>').addClass('q-settings').appendTo(dl0);
                    var li1 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl1 = $('<dl/>').appendTo(li1);
                    var dt1 = $('<dt/>').append($messages['label.answerType']).appendTo(dl1);
                    setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                        .addClass('icon help subject-type').appendTo(dt1)), 0);

                    var dd1 = $('<dd/>').appendTo(dl1);
                    var selectionType = $('<div/>', {'data-toggle': 'buttons'}).addClass('btn-group selection-type').appendTo(dd1);

                    var bool = q.type == ENUM.TYPE.SUBJECT_TEXT;
                    var text = $('<label/>').addClass('btn btn-default').append($messages['button.text']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(text).change(onChangeSubjectType)
                        .val(ENUM.TYPE.SUBJECT_TEXT).prop('checked', bool).attr('autocomplete', 'off');
                    text.addClass(bool ? 'active' : '');

                    bool = q.type == ENUM.TYPE.SUBJECT_NUMERIC;
                    var numeric = $('<label/>').addClass('btn btn-default').append($messages['button.integer']).appendTo(selectionType);
                    $('<input/>', {type: 'radio', name: 'type'}).prependTo(numeric).change(onChangeSubjectType)
                        .val(ENUM.TYPE.SUBJECT_NUMERIC).prop('checked', bool).attr('autocomplete', 'off');
                    numeric.addClass(bool ? 'active' : '');

                    if ($ws.principal.admin) {
                        bool = q.type == ENUM.TYPE.SUBJECT_ADDRESS;
                        var address = $('<label/>').addClass('btn btn-default').append($messages['button.address']).appendTo(selectionType);
                        $('<input/>', {type: 'radio', name: 'type'}).prependTo(address).change(onChangeSubjectType)
                            .val(ENUM.TYPE.SUBJECT_ADDRESS).prop('checked', bool).attr('autocomplete', 'off');
                        address.addClass(bool ? 'active' : '');

                        bool = q.type == ENUM.TYPE.SUBJECT_PHONE;
                        var phone = $('<label/>').addClass('btn btn-default').append($messages['button.phone']).appendTo(selectionType);
                        $('<input/>', {type: 'radio', name: 'type'}).prependTo(phone).change(onChangeSubjectType)
                            .val(ENUM.TYPE.SUBJECT_PHONE).prop('checked', bool).attr('autocomplete', 'off');
                        phone.addClass(bool ? 'active' : '');

                        bool = q.type == ENUM.TYPE.SUBJECT_DATE;
                        var date = $('<label/>').addClass('btn btn-default').append($messages['button.date']).appendTo(selectionType);
                        $('<input/>', {type: 'radio', name: 'type'}).prependTo(date).change(onChangeSubjectType)
                            .val(ENUM.TYPE.SUBJECT_DATE).prop('checked', bool).attr('autocomplete', 'off');
                        date.addClass(bool ? 'active' : '');
                    }

                    bool = q.isPrivacy;
                    var disableCheck = q.type == ENUM.TYPE.SUBJECT_NUMERIC;
                    var privacy = $('<label/>', {style: 'margin-left: 16px;'}).append($messages['checkbox.privacy']).appendTo(selectionType);
                    setTimeout($.proxy(initializeICheck, $('<input/>', {type: 'checkbox', name: 'isPrivacy'})
                        .prependTo(privacy).prop('checked', bool).attr('disabled', disableCheck).on('ifChanged', onChanged)), 0);


                    var li5 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl5 = $('<dl/>').appendTo(li5);
                    var dt5 = $('<dt/>').appendTo(dl5);
                    var dd5 = $('<dd/>').appendTo(dl5);

                    var span = $('<span/>').appendTo(dl5);
                    span.append($messages['label.option1integer'] + ' ');
                    $('<input/>', {type: 'text', name: 'minval'}).appendTo(span).val(q.minval)
                        .on('input propertychange', onChanged).numeric($.extend({}, defaultNumericOptions, {negative: true}));
                    span.append(' ' + $messages['label.option2integer'] + ' ');
                    $('<input/>', {type: 'text', name: 'maxval'}).appendTo(span).val(q.maxval)
                        .on('input propertychange', onChanged).numeric($.extend({}, defaultNumericOptions, {negative: true}));
                    span.append(' ' + $messages['label.option3integer'] + ' ');
                    $('<input/>', {type: 'text', name: 'unit'}).appendTo(span).val(q.unit)
                        .on('input propertychange', onChanged);

                    var isNumeric = q.type == ENUM.TYPE.SUBJECT_NUMERIC;
                    li5[isNumeric ? 'show' : 'hide']();

                    break;
                case ENUM.TYPE_GROUP.EVALUATION:
                    setTimeout($.proxy(initializeWysiwyg, $('.eval-inputs > li:eq(0) > div', qContainer0)
                        , {placeholder: $messages['placeholder.evalBad']}, {tinymce: 'tinymce-evaluative'}, wysiwyg), 300);
                    setTimeout($.proxy(initializeWysiwyg, $('.eval-inputs > li:eq(1) > div', qContainer0)
                        , {placeholder: $messages['placeholder.evalNeutral']}, {tinymce: 'tinymce-evaluative'}, wysiwyg), 300);
                    setTimeout($.proxy(initializeWysiwyg, $('.eval-inputs > li:eq(2) > div', qContainer0)
                        , {placeholder: $messages['placeholder.evalGood']}, {tinymce: 'tinymce-evaluative'}, wysiwyg), 300);

                    var qSettingsForThisType = $('<ul/>').addClass('q-settings').appendTo(dl0);
                    var li1 = $('<li/>').appendTo(qSettingsForThisType);
                    var dl1 = $('<dl/>').appendTo(li1);
                    var dt1 = $('<dt/>').append($messages['label.answerType']).appendTo(dl1);
                    setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                        .addClass('icon help evaluation-type').appendTo(dt1)), 0);

                    var dd1 = $('<dd/>').appendTo(dl1);
                    // dd1.append('응답자에게 ');
                    var evalLevel = $('<select/>', {name: 'evallevel'}).addClass('selectpicker').appendTo(dd1)
                        .data('width', 'auto').change(onChanged);
                    dd1.append(' ' + $messages['label.optionEval']);

                    for (var i = 3; i <= 10; i++) {
                        if (i == 8)
                            continue;
                        $('<option/>').val(i).append(i).appendTo(evalLevel)
                            .prop('selected', q.evallevel == i);
                    }
                    $('<option/>').val(11).append(11 + '(NPS)').appendTo(evalLevel)
                        .prop('selected', q.evallevel == 11);
                    evalLevel.change(function () {
                        var graph = $('.eval-levels', $(this).closest('.q-container'));
                        var evalIntput = $('.eval-inputs', $(this).closest('.q-container'));
                        var v = parseInt($('option:selected', this).val(), 10);
                        refreshEvalLevels(v, graph);
                        refreshEvalInputs(v, evalIntput);
                        containerBatch.find('[data-id="' + q.questionno + '"] span').text($messages['detailedType.rating'].replace('{0}', v))
                    }).selectpicker('refresh');

                    break;
                case ENUM.TYPE_GROUP.IMAGE:
                    // TODO: 이미지형 처리, 현재는 처리할 게 없음

                    break;
            }


            var qSettings0 = $('<ul/>').addClass('q-settings').appendTo(dl0);
            var li3 = $('<li/>').appendTo(qSettings0);
            var dl3 = $('<dl/>').appendTo(li3);
            var dt3 = $('<dt/>').append($messages['label.questionLogic']).appendTo(dl3);
            setTimeout($.proxy(generatePopover, $('<a/>', {role: 'button', tabindex: 0})
                .addClass('icon help q-logic').appendTo(dt3)), 0);

            var dd3 = $('<dd/>').appendTo(dl3);
            dd3.append($messages['label.beforeLogic'] + ' ');
            $('<textarea/>', {name: 'entrycondition'}).appendTo(dd3).val(q.entrycondition)
                .on('input propertychange', onChanged);
            dd3.append(' ' + $messages['label.beforeLogic1']);
            $('<input/>', {type: 'text', name: 'blockednextqno', maxlength: 3}).appendTo(dd3).val(q.blockednextqno)
                .on('input propertychange', onChanged).numeric($.extend({}, defaultNumericOptions, {negative: true}));
            dd3.append(' ' + $messages['label.beforeLogic2']);

            var li4 = $('<li/>').appendTo(qSettings0);
            var dl4 = $('<dl/>').appendTo(li4);
            var dt4 = $('<dt/>').appendTo(dl4);
            var dd4 = $('<dd/>').appendTo(dl4);
            dd4.append($messages['label.afterLogic'] + ' ');

            setTimeout($.proxy(generateAfterQ,
                $('<select/>', {name: 'nextquestionno'}).addClass('selectpicker').appendTo(dd4).data('width', 'auto'),
                q.nextquestionno, $messages['option.none'], $messages['label.gotoQuestion']), 0);

            var deferred = $.proxy(renderErrors, q, this);
            setTimeout(deferred, 500);
            $.when(deferred).done($.proxy(function () {
                busyService.end(this.children('.q-container'));
            }, this));


            renderCommentbody(qContainer0);

            if (q.pipingtype && q.type === ENUM.TYPE.MULTIPLE) {
                var qContainer1 = $(this).find('.q-container');
                var isSingle = this.value == ENUM.TYPE.SINGLE || this.value == ENUM.TYPE.SINGLE_SCALE;

                qContainer1.find('[name=maxselection]').val(isSingle ? 1 : qContainer1.find('.options > li:not(.exclusive)').length);
                refreshSelectionCount(q, qContainer1);
            }
        }, this, wysiwyg0);

        if (previous.length) {
            wholeScroller.addClass('busy');

            deactivate(previous, activate);
        } else {
            activate();
        }
    };

    var deactivate = function (previous, activate) {
        var prevQ = findQbyQNo(previous.attr('id'));
        var prevQContainer = $('.q-container', previous).removeData('longInitializingElementsCount');

        $('[aria-describedby]').popover('hide');

        var wysiwygs = $('[contenteditable]', previous);
        var remainingCount = wysiwygs.length;

        if (remainingCount) {
            var deferred1 = $.Deferred();

            wysiwygs.each($.proxy(function (container01, prevQ01, deferred2) {
                try {
                    setTimeout($.proxy(function (container02) {
                        this.tinymce().destroy();
                        this.closest('.tinymce-wrapper').before(this).remove();

                        $.proxy(busyService.end, busyService, container02)();

                        if (--remainingCount == 0) {
                            deferred2.resolve();
                        }
                    }, $(this), container01), 0);
                } catch (e) {
                }
            }, null, prevQContainer, prevQ, deferred1));

            deferred1.promise().always(activate);
        }

        var options = $('.options', previous);
        $('.crop-container > img, .image-container > img', options).each(function () {
            var $this = $(this);
            $('<img/>', {src: $this.closest('.image-container').data('filenameOrigin') + '?timestamp=' + new Date().getTime()})
                .insertAfter($('.number-container', $this.closest('li')));

            if ($this.siblings('.cropper-container').length) {
                $this.cropper('destroy');
            }
        });
        options.children().each($.proxy(function (container01, prevQ01) {
            var self = $(this);
            var input0 = $('.input', self);
            var input = input0.children('[name=description]');
            if (input.length) {
                input0.html('<p class="fr-tag">' + input.val() + '</p>');
                input0.closest('.tinymce-wrapper').before(input0).remove();
            }

            for (var i in prevQ01.surveyQuestionOptionses) {
                if (self.attr('id').substring(1) == prevQ01.surveyQuestionOptionses[i].optionno) {
                    self.find('.post-option').remove();
                    $.proxy(renderPostOption, self.find('.input'), prevQ01.surveyQuestionOptionses[i])();
                    break;
                }
            }
        }, null, prevQContainer, prevQ)).end().sortable('destroy');

        $(removalsOnDeactive, previous).remove();

        refreshQSummary(prevQ, $('.q-summary', previous));
        if (getTypeGroup(prevQ.type) === ENUM.TYPE_GROUP.SUBJECT) {
            refreshSubjectDesc(prevQ, $('.q-description', previous));
        } else if (getTypeGroup(prevQ.type) === ENUM.TYPE_GROUP.IMAGE) {
            refreshImageDesc(prevQ, $('.q-description', previous));
        } else if (getTypeGroup(prevQ.type) === ENUM.TYPE_GROUP.BARCODE) {
            refreshBarcodeDesc(prevQ, $('.q-description', previous));
        }
        previous.removeClass('q-active');
        var isPrivacy = prevQ.isPrivacy === null ? false : prevQ.isPrivacy;
        previous.find('.froala-view').toggleClass('has-badge', isPrivacy);
        clearTimeout(prevQContainer.data('timeout'));
        $('.has-error', previous).removeClass('has-error');

        if (prevQ.pipingtype > 0) {
            refreshPipingDesc(prevQ, $('.piping-description', previous));
        }

        var writingComments = $('.comment textarea:visible', prevQContainer).filter(function () {
            return !!$(this).val().replace(/\s/ig, '');
        });
        if (writingComments.length) {
            prevQContainer.data(postSavingCommentsForDeactivating.key, writingComments.length);
            writingComments.each(function () {
                $(this).closest('form').trigger('submit');
            });
        } else {
            renderCommentSummary(prevQContainer);
        }
    };

    var postSavingCommentsForDeactivating = {
        key: 'count-saving-comments-for-deactivating', msg: $messages['notice.commentAutosaved'],
        func: function (qContainer) {
            var count = qContainer.data(this.key);
            if (count) {
                if (--count > 0) {
                    qContainer.data(this.key, count);
                } else {
                    renderCommentSummary(qContainer);
                    $notify(this.msg);
                    qContainer.removeData(this.key);
                }
            }
        }
    };


    var refreshQuestions = function (r, previousScrollTop) {
        questions = r;
        setSelectQuestionNumber(questions.length);

        if (r.length) {
            busyService.start(true);

            $.each(questions, function (i, q) {
                setTimeout($.proxy(function () {
                    $mprogress.set(i / questions.length);
                    setTimeout($.proxy(function () {
                        this.removeClass('heel');
                        if (!isNaN(previousScrollTop) && questions.length >= i + 1) {
                            elWin.scrollTop(previousScrollTop);
                        }
                    }, $.proxy(drawQuestion, this)()), 10);
                }, q), 0);
            });
        }
        if (r.length === $profiles.length) {
            containerQuestions.addClass('new-survey');
        }

        setTimeout(function () {
            refreshAlerts();
            busyService.end();

            if ($printPromise) {
                // bootstrap의 print.less때문에 배경이미지가 다 죽는 걸 모르고.. 속았다! 그래도 좋은 경험..
                var generateIconImages = function () {
                    var self = $(this);
                    var url = self.css('backgroundImage').replace(/@2x/i, '')
                        .replace(/.*\s?url\([\'\"]?/, '').replace(/[\'\"]?\).*/, '');
                    $('<img/>', {src: url.substring(url.indexOf('/', 15))}).appendTo(this);
                    self.css('backgroundImage', 'none');
                };
                containerQ.find('.pre-logic, .random, .piping-description, .post-option, .post-logic')
                    .find('.icon').each(generateIconImages);
                containerQ.find('.options .icon.lock').each(generateIconImages);

                surveyDescription.prop('contenteditable', false);
                $('#survey-print-title').css('display', 'block');

                var date = formattedDate();
                document.title = '(OPENSURVEY 설문지)_' + (surveyFields.title.val() ? surveyFields.title.val().replace(/\s/g, '_') : '') + '_' + date;
                $printPromise.resolve();
            }
            setTimeout(function() {
                matchSidebarPositionToWindow(r);
            }, 650);
        }, 300);
        refreshSidebar();
    };

    var formattedDate = function () {
        var date = new Date();
        var year = date.getFullYear().toString().substr(2);
        var month = date.getMonth() + 1; month = (month < 10 ? '0' : '') + month;
        var day = date.getDate(); day = (day < 10 ? '0' : '') + day;
        return year + '-' + month + '-' + day;
    };

    var isProfile = function (questionno) {
        return $profiles && $profiles.indexOf(questionno) !== -1;
    };

    $restfulAjax($apiPathPrefix.survey + '/questions', 'GET', null, refreshQuestions);

    if(!Cookies.get('close-month-questions-check-modal-' + surveyno) && !Cookies.get('close-day-questions-check-modal-' + surveyno)) {
        Cookies.set('close-day-questions-check-modal-' + surveyno, true, {expires: 1});
        $('.check-modal').css('display', 'block');
    }

    var closeCheckModal = function() {
        if($('#close-month-checkbox').is(":checked")) {
            Cookies.set('close-month-questions-check-modal-' + surveyno, true, {expires: 30});
        }
        $('.check-modal').css('display', 'none');
        $('.check-modal-close-month').css('display', 'block');
    };

    $('.check-modal-confirm-button').click(closeCheckModal);

    $('.open-checklist-modal').click(function() {
        $('.check-modal').css('display', 'block');
        $('.check-modal-close-month').css('display', 'none');
    })

    $('.calculator-title').text('계산기');

    $('.col-sm-6 > a:nth-last-child(1), .col-sm-6 > a:nth-last-child(3)').click(function() {
        if(!$('.error-count').hasClass('hide')) {
            alert($messages['error.next']);
            return false;
        }
    })

    if($.isPlainObject($survey.status)) $survey.status = $survey.status.$name;

    if(!($survey.status === $ENUM.SURVEY_STATUS.작성중 || $survey.status === $ENUM.SURVEY_STATUS.견적요청중) || $isCorporate) {
        $('#sidebar-calculator-button').hide();
    }

    $('#title').change(refreshAlerts)

    if(!$isAdmin) {
        simulate();
        $('.sidebar > .left').css('transition', 'inherit')
        $('#sidebar-preview-button').addClass('active')
        $('.sidebar > .left').css('visibility', 'hidden')
        $('.sidebar > .left').css('right', '60px')
        $('#sidebar-preview').css('visibility', 'visible')
        setTimeout(function() { $('.sidebar > .left').css('transition', 'right .4s') }, 1000)
    }
});
