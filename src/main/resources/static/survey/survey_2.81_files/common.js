/**
 * Created by ian on 2015. 5. 22..
 */
var $restfulAjax;
var $mprogress;

var $ENUM = {};
var $apiPathPrefix;
var $notifyTop;
var $notify;

var $statusService;
var $surveyStatuses;
var $initSurveyStatus;

var $ws;
var $exclusiveSessiontypes;

var $printPromise;

var $messages;

var $diffWithStandard;
var $setSaved;

var loadIframeNum = 0;

var setReadOnlyTitle = function() {
    $('#title').prop('readonly', true);
    $('#title').addClass('readonly');
    $('.title-icon').css('display', 'none');
}

var setCanEditTitle = function() {
    $('#title').prop('readonly', false);
    $('#title').removeClass('readonly');
    $('.title-icon').css('display', 'inline-block');
}

var setTitle = function(title) {
    $('#title').val(title)
    document.title = title + " | " + $messages['document.title']
}

$(function () {
    $restfulAjax = function (url, type, data, success, error) {
        var option = {
            type: type || 'GET',
            url: url,
            cache: false,
            data: data && typeof(data) == 'object' ? JSON.stringify(data) : data,
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            headers: {'X-Auth-Token': $sessionToken}, // CORS Security
            xhrFields: {withCredentials: true},
            success: success,
            error: error || function (jqXHR, textStatus, errorThrown) {
                console.log('Restful AJAX 오류 발생!', textStatus, errorThrown);
            }
        };
        return $.ajax(option);
    };
    $mprogress = new Mprogress({parent: '.nav-top'});

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

    $.extend($ENUM, {
        SURVEY_STATUS: {}, EXCLUSIVE_SESSION_TYPE: {}
        , NOTIFICATION: {POSITIVE: 'positive', NEUTRAL: 'neutral', NEGATIVE: 'negative'}
    });
    for (var idx in $exclusiveSessiontypes) {
        $ENUM.EXCLUSIVE_SESSION_TYPE[$exclusiveSessiontypes[idx].$name] = $exclusiveSessiontypes[idx].$name;
    }
    for (var idx in $surveyStatuses) {
        $ENUM.SURVEY_STATUS[$surveyStatuses[idx].$name] = $surveyStatuses[idx].$name;
    }

    var notiTopbar = $('.notification');
    var wholeScroller = $('html, body');
    $notifyTop = function (type, msg) {
        if (type) {
            notiTopbar.removeClass($.map($ENUM.NOTIFICATION, function (val) {
                return val;
            }).join(' ')).addClass(type).children('span').empty().html(msg);
        }
        wholeScroller[type ? 'addClass' : 'removeClass']('notifying');
    };
    $('button', notiTopbar).click(function () {
        $notifyTop();
        this.blur();
    });


    var noSupportNotification = !('Notification' in window);
    var notifyToDesktop = function (content) {
        var n = new Notification('오픈서베이 설문편집에서 알려드려요!', {
            icon: '/static/_images/common/favicons/mstile-70x70.png',
            body: $('<p/>').html(content).text()
        });
        setTimeout(n.close.bind(n), 8000);
    };
    var containerNotification = $('#container-notification');
    var notifyToInside = function (content) {
        var listItem = $('<li/>').addClass('animating-hidden').appendTo(containerNotification);
        var anchor = $('<a/>').attr('href', '').append(content).appendTo(listItem).click(function (e) {
            var $this = $(this);

            e.preventDefault();

            clearTimeout($this.data('timeout'));
            setTimeout($.proxy(function () {
                this.remove();
            }, $this.closest('li').addClass('animating-hidden')), 500);
        });
        $('<i/>').addClass('icon bell').prependTo(anchor);
        $('<i/>').addClass('icon -close').appendTo(anchor);
        setTimeout($.proxy(function () {
            this.removeClass('animating-hidden');
        }, listItem), 10);

        anchor.data('timeout', setTimeout($.proxy(function () {
            setTimeout($.proxy(function () {
                this.remove();
            }, this.addClass('animating-hidden')), 500);
        }, listItem), 3000));
    };
    $notify = function (content) {
        if (true || noSupportNotification || Notification.permission === 'denied') {
            notifyToInside(content);
        } else if (Notification.permission === 'granted') {
            notifyToDesktop(content);
        } else {
            notifyToInside(content);

            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === 'granted') {
                    notifyToDesktop(content);
                }
            });
        }
    };


    var surveyno = parseInt(location.pathname.split('/')[2], 10);
    $apiPathPrefix = {survey: '/v1/surveys/' + surveyno, question: '/v1/questions', media: '/v1/media'};

    var socket, stompClient;

    $ws = {
        obj: null,
        principal: {
            name: $editorPrincipal.occupantName, email: $editorPrincipal.occupantEmail, admin: $editorPrincipal.admin
        },
        session: null, sessionOwned: null, countRetryConn: 0, tryReConn: function () {
            $ws.lock({});
            $notifyTop($ENUM.NOTIFICATION.NEGATIVE, $messages['notice.unexpectedTroubles']);

            stompClient.disconnect();
            $ws.tryingConn = setTimeout($ws.conn, 5000);

            if (++$ws.countRetryConn > 20) {
                $('.to-be-saved').removeClass('to-be-saved');
                location.reload();
            }
        },
        conn: function (param) {
            var options = {
                transports: ["websocket", "xhr-streaming", "xdr-streaming", "xhr-polling", "xdr-polling", "iframe-htmlfile", "iframe-eventsource", "iframe-xhr-polling"]
            };
            socket = new SockJS('/sock', undefined, options);
            socket.onclose = $ws.tryReConn;

            stompClient = Stomp.over(socket);
            stompClient.debug = null;
            stompClient.connect({}, $.proxy(function () {
                var url = socket._transport[socket._transport.url ? 'url' : 'transUrl'];

                if ($ws.tryingConn) {
                    clearTimeout($ws.tryingConn);
                    $ws.tryingConn = null;
                    $ws.countRetryConn = 0;
                }

                $ws.session = url.split('/')[5];
                $ws.sessionOwned = null;
                $ws.func();
            }, param), $ws.tryReConn);
        },
        func: function () {
            $ws.release();
            $statusService.apply();

            this.obj = stompClient.subscribe($messages['websocket.questions'].replace('{surveyno}', surveyno), function (r) {
                r = JSON.parse(r.body);
                $ws.onSubscribe(r);
            }, {});

            $restfulAjax($apiPathPrefix.survey + '/checks/session', 'GET', null, function (r) {
                $ws.onChecked(r);
            });
        },
        take: function (timeout) {
            stompClient.send('/sock-app/' + surveyno + '-takes-session', {},
                timeout ? JSON.stringify({timeout: timeout}) : '{}');
        },
        onSubscribe: function (r) {
        },
        onChecked: function (r) {
        },

        lock: function () {
        },
        release: function () {
        }
    };


    var btnSurveyLive = $('#btn-survey-live');
    $statusService = new function () {
        var isQuestionsPage = location.pathname.indexOf('questions') > -1;
        this.previousStatus = $initSurveyStatus.$name;
        this.apply = function (status) {
            var msg0;
            var isFine = true;

            status = status || this.previousStatus;
            btnSurveyLive.addClass('hide');
            $('.next-step-button').removeClass('hide');

            switch (status) {
                case $ENUM.SURVEY_STATUS.작성중:
                    if (!this.previousIsFine) {
                        this.previousIsFine = true;
                        $ws.release();
                    }
                    break;
                case $ENUM.SURVEY_STATUS.결제요청중:
                case $ENUM.SURVEY_STATUS.견적요청중:
                case $ENUM.SURVEY_STATUS.시작대기중:
                case $ENUM.SURVEY_STATUS.진행중:
                case $ENUM.SURVEY_STATUS.진행완료:
                    $ws.lock();
                    isFine = false;

                    switch (status) {
                        case $ENUM.SURVEY_STATUS.결제요청중:
                            msg0 = $messages['notice.status.requestingPayment'];
                            break;
                        case $ENUM.SURVEY_STATUS.견적요청중:
                            msg0 = isQuestionsPage ? $messages['notice.status.checking.questionPage'] : $messages['notice.status.checking'];
                            break;
                        case $ENUM.SURVEY_STATUS.시작대기중:
                            msg0 = isQuestionsPage ? $messages['notice.status.requestingStart.questionPage'] : $messages['notice.status.requestingStart'];
                            break;
                        case $ENUM.SURVEY_STATUS.진행중:
                            msg0 = isQuestionsPage ? $messages['notice.status.working.questionPage'] : $messages['notice.status.working'];
                            break;
                        case $ENUM.SURVEY_STATUS.진행완료:
                            msg0 = isQuestionsPage ? $messages['notice.status.finished.questionPage'] : $messages['notice.status.finished'];
                            break;
                    }
                    $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg0);

                    break;

                case $ENUM.SURVEY_STATUS.전문가리뷰중:
                case $ENUM.SURVEY_STATUS.진행요청중:
                    if (!$ws.principal.admin) {
                        $ws.lock();
                        isFine = false;

                        switch (status) {
                            case $ENUM.SURVEY_STATUS.전문가리뷰중:
                                msg0 = isQuestionsPage ? $messages['notice.status.checking.questionPage'] : $messages['notice.status.checking'];

                                if ($('#container-questions').length && !$('#review-summary').length && (!$('.to-be-saved').length
                                        || confirm('페이지를 새로고침 하시면 설문 리뷰를 실시간으로 받아보실 수 있어요.\n\n페이지를 새로고침 할까요?'))) {
                                    location.reload();
                                }
                                break;
                            case $ENUM.SURVEY_STATUS.진행요청중:
                                msg0 = isQuestionsPage ? $messages['notice.status.requestingStart.questionPage'] : $messages['notice.status.requestingStart'];
                                break;
                        }
                        $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg0);
                    } else if (status == $ENUM.SURVEY_STATUS.전문가리뷰중 && $('#container-questions').length) {
                        if ($('#review-summary').length) {
                            if (!this.previousIsFine) {
                                this.previousIsFine = true;
                                $ws.release();
                            }
                        } else if (!$('.to-be-saved').length
                            || confirm('설문 상태가 ' + status + '으로 바뀌어, 페이지를 새로고침 합니다. 계속하시겠습니까?')) {
                            location.reload();
                        }
                    }

                    break;

                case $ENUM.SURVEY_STATUS.전문가리뷰완료:
                    if ($ws.principal.admin) {
                        $ws.lock();
                        isFine = false;
                        msg0 = $messages['notice.status.finishedReview'];
                        $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg0);
                    } else {
                        btnSurveyLive.removeClass('hide');
                        $('.next-step-button').addClass('hide');

                        if(!isQuestionsPage) {
                            $ws.lock();
                            isFine = false;
                            msg0 = $messages['notice.status.finishedReview'];
                            $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg0);
                        }

                        if (!this.previousIsFine) {
                            this.previousIsFine = true;
                            $ws.release();
                        }
                    }
                    break;

                case $ENUM.SURVEY_STATUS.취소:
                    if ($ws.principal.admin) {
                        $ws.lock();
                        isFine = false;
                        msg0 = $messages['notice.status.canceled'];
                        $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg0);
                    }
                    break;
            }

            this.previousStatus = status;
            this.previousIsFine = isFine;

            return isFine;
        }
    };


    var beforePrint = new function () {
        this.func = function () {
            if ($printPromise.title) {
                beforePrint.title = document.title;
                document.title = $printPromise.title;
            }

            $('#container-questions, #container-survey > .container').css('marginTop', '-50px');
            $('#gnb').hide();
            $('.nav-top').hide();

            //IE8 이하 미디어쿼리 미지원 구형 브라우저 호환
            $('#questions').css({'margin-bottom': '-75px', overflow: 'hidden'});
            $('html, body').css('height', 'auto');
        }
    };
    var afterPrint = function () {
        $('#container-questions, #container-survey > .container').css('marginTop', '');
        $('.nav-top').show();

        $('#questions').css({'margin-bottom': '', overflow: ''});
        $('html, body').css('height', '');

        if (beforePrint.title) {
            document.title = beforePrint.title;
        }
    };
    var ua = navigator.userAgent.toUpperCase();
    if (window.matchMedia && ua.indexOf('FIREFOX') == -1 && ua.indexOf('MSIE') == -1 && ua.indexOf('TRIDENT') == -1) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function (mql) {
            if (mql.matches) {
                beforePrint.func();
            } else {
                //$(document).one('mouseover', afterPrint);
                afterPrint();
            }
        });
    } else {
        window.onbeforeprint = $.proxy(beforePrint.func, beforePrint);
        window.onafterprint = afterPrint;
    }


    if (location.hash == '#print') {
        var msg = $messages['notice.print'];
        $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg);

        $printPromise = $.Deferred();
        $printPromise.promise().done(function () {
            $ws.lock();
            $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg);

            wholeScroller.data('printInterval', setInterval(function () {
                if (!wholeScroller.hasClass('busy') && !$('.ui-mprogress').length) {
                    clearInterval(wholeScroller.data('printInterval'));
                    wholeScroller.removeData('printInterval');

                    $('.survey-content').prop('contenteditable', false);

                    window.print();
                }
            }, 1000));
        });

        wholeScroller.addClass('readonly print');

        $('#gnb').css('display', 'none')
    } else if (location.hash == '#print-with-comment') {
        var msg = $messages['notice.print'];
        $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg);

        $printPromise = $.Deferred();
        $printPromise.promise().done(function () {
            $ws.lock();
            $notifyTop($ENUM.NOTIFICATION.NEUTRAL, msg);

            wholeScroller.data('printInterval', setInterval(function () {
                if (!wholeScroller.hasClass('busy') && !$('.ui-mprogress').length) {
                    clearInterval(wholeScroller.data('printInterval'));
                    wholeScroller.removeData('printInterval');

                    $('.survey-content').prop('contenteditable', false);

                    window.print();
                }
            }, 1000));
        });

        wholeScroller.addClass('readonly print-with-comment');
    } else {
        $ws.conn({isInit: true});
    }

    var $title = $('#title');

    function resizable (el, factor) {
        function resize() {
            var virtualDom = document.createElement('div');
            virtualDom.id = 'virtual_dom';
            virtualDom.innerText = el.value;

            $('body').append(virtualDom);

            var inputWidth =  $('#virtual_dom').width() + factor;

            $('#virtual_dom').remove();

            el.style.width = inputWidth + 'px'
        }
        var e = 'keyup,keypress,focus,blur,change'.split(',');
        for (var i in e) el.addEventListener(e[i],resize,false);
        resize();
    }

    resizable(document.getElementById('title'),30);

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
            params._fields.push('title');
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
                    setTitle(jqXHR.responseJSON.title);

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

    // $title.on({
    //     'input propertychange': function () {
    //         var self = $(this);
    //         var currentContent = self.val();
    //         if (currentContent !== self.data('previousContent')) {
    //             clearTimeout(self.data('timeout'));
    //             self.addClass('to-be-saved-for-survey');
    //             self.data({
    //                 timeout: setTimeout($.proxy(saveSurvey, self), 5000),
    //                 previousContent: currentContent
    //             });
    //
    //             $ws.take();
    //         }
    //     }, 'blur': function () {
    //         var self = $(this);
    //         clearTimeout(self.data('timeout'));
    //         setTimeout($.proxy(saveSurvey, self), 0);
    //     }
    // });

    $title.on({
        'keypress': function (e) {
            if(e.keyCode === 13) {
                var self = $(this);
                clearTimeout(self.data('timeout'));
                setTimeout($.proxy(saveSurvey, self), 0);
            }
        },
        'blur': function() {
            var self = $(this);
            clearTimeout(self.data('timeout'));
            setTimeout($.proxy(saveSurvey, self), 0);
        }
    });

    var currentContent = $title.val();
    autoReheight($title.data({persistent: currentContent, previousContent: currentContent}));

    $('.next-step-button').click(function() {
        if(!$('.error-count').hasClass('hide') && location.pathname.indexOf('questions') > -1) {
            alert($messages['error.next']);
            return false;
        }
        if($survey.type === 1) {
            if(location.pathname.indexOf('questions') > -1) {
                location.href = '/surveys/' + $survey.surveyno + '/preview'
            } else if(location.pathname.indexOf('preview') > -1) {
                location.href = '/surveys/' + $survey.surveyno + '/link'
            } else {
                location.href = '/surveys/' + $survey.surveyno + '/questions'
            }
        } else {
            if(location.pathname.indexOf('questions') > -1) {
                location.href = '/surveys/' + $survey.surveyno + '/preview'
            } else if(location.pathname.indexOf('preview') > -1) {
                location.href = $diyHost + '/diy/surveys/' + $survey.surveyno + '/payment'
            } else {
                location.href = '/surveys/' + $survey.surveyno + '/questions'
            }
        }
    });

    $('.title-icon').click(function() {
        var $title = $('#title');
        if ($title.val() === $messages['survey.title']) {
            $title.focus().select();
        } else {
            $title.focus()
        }
    })

    $('#title').click(function() {
        var title = $(this).val()
        if ($('#title').val() === $messages['survey.title']) {
            $(this).focus().select();
        }
    })
});


moment.locale('ko', {
    relativeTime: function (number, withoutSuffix, key) {
        var original = moment.localeData();
        return key == 's' ? '방금' : original._relativeTime[key].replace(/%d/, number);
    }
});


// MSDN Official https://msdn.microsoft.com/en-us/library/ms537509(v=vs.85).aspx
// 버전11 미만에서만 검출 가능
function getInternetExplorerVersion()
// Returns the version of Internet Explorer or a -1
// (indicating the use of another browser).
{
    var rv = Infinity; //-1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer') {
        var ua = navigator.userAgent;
        var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat(RegExp.$1);
    }
    return rv;
}
