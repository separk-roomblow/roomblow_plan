var DETAIL_TARGETING_ITEMS = Object.freeze({
    '나이': [
        {
            name: '10대 (만 14~19세)',
            unitPrice: 0
        },
        {
            name: '60대 이상',
            unitPrice: 0
        },
    ],
    '직업': [
        {
            name: '대학(원)생',
            unitPrice: 1000
        },
        {
            name: '직장인',
            unitPrice: 1000
        },
        {
            name: '자영업자',
            unitPrice: 2500
        },
        {
            name: '전업주부',
            unitPrice: 1000
        },
        {
            name: '스타트업 재직자',
            unitPrice: 15000
        },
    ],
    '가족': [
        {
            name: '1인 가구',
            unitPrice: 5000
        },
        {
            name: '2인 가구',
            unitPrice: 2500
        },
        {
            name: '0~36개월 자녀를 둔 부모',
            unitPrice: 2500
        },
        {
            name: '만 3세 이상~취학 전 자녀를 둔 부모',
            unitPrice: 2500
        },
        {
            name: '초등학생 자녀를 둔 부모',
            unitPrice: 5000
        },
        {
            name: '중고생 자녀를 둔 부모',
            unitPrice: 2500
        },
        {
            name: '반려견을 기르는 사람',
            unitPrice: 2500
        },
        {
            name: '반려묘를 기르는 사람',
            unitPrice: 5000
        },
    ],
    '구매 채널': [
        {
            name: '최근 3개월 내 온라인/모바일 쇼핑 경험자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 대형마트 쇼핑 경험자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 편의점 구매 경험자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 드럭스토어 구매 경험자',
            unitPrice: 1000
        }
    ],
    '구매 제품': [
        {
            name: '최근 3개월 내 식료품 구매자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 화장품 구매자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 맥주 구매자',
            unitPrice: 500
        },
        {
            name: '최근 3개월 내 담배 구매자',
            unitPrice: 1000
        },
    ],
    '보유 여부': [
        {
            name: '자동차 보유자',
            unitPrice: 1000
        },
        {
            name: 'AI 스피커 보유자',
            unitPrice: 2500
        },
        {
            name: '공기청정기 보유자',
            unitPrice: 1000
        },
    ],
    '금융': [
        {
            name: '신용카드 사용자',
            unitPrice: 500
        },
        {
            name: '모바일 뱅킹 앱 사용자',
            unitPrice: 500
        },
        {
            name: '간편결제 사용자',
            unitPrice: 500
        },
        {
            name: '대출 경험자',
            unitPrice: 5000
        },
        {
            name: '주식투자 경험자',
            unitPrice: 2500
        },
    ],
    'OS': [
        {
            name: 'iOS 사용자',
            unitPrice: 500
        },
        {
            name: '안드로이드 사용자',
            unitPrice: 500
        },
    ],
    '직접 입력': []
});

var QUESTION_PRICE_LIST_PER_PERSON = [800, 1400, 2000, 2700, 3400, 4400];
var OPERATION_COST = 100000;
var detailTargetingUnitPrice = 0;
var selectQuestionNumber = 1;
var selectPeopleNumber = 0;
var isSetGenExtra = false;

var setPeopleNumber = function(number) {
    selectPeopleNumber = number;
}

var setDetailTargetingUnitPrice = function(unitPrice) {
    detailTargetingUnitPrice = unitPrice;
}

var setSelectQuestionNumber = function(number) {
    selectQuestionNumber = number;
}

var changeGenExtra = function(bool) {
    isSetGenExtra = bool;
}

$(function () {
    var sidebarLeftWidth = 320
    var sidebarRightWidth = 60

    $('.sidebar-button').on('classChange', function () {
        if ($('.sidebar-button.active').length > 0) {
            $('.sidebar > .left').css('visibility', 'hidden')

            if($('#sidebar-calculator-button').hasClass('active')) {
                $('#sidebar-calculator').css('visibility', 'visible')
            }

            if($('#sidebar-preview-button').hasClass('active')) {
                $('#sidebar-preview').css('visibility', 'visible')
            }

            if($('#sidebar-fix-error-button').hasClass('active')) {
                $('#sidebar-fix-error').css('visibility', 'visible')
            }

            $('.sidebar > .left').css('right', sidebarRightWidth + 'px')
        } else {
            $('.sidebar > .left').css('right', -1 * sidebarLeftWidth + 'px')
        }
    })

    $('[data-toggle="sidebar-tooltip"]').tooltip()
    $('[data-toggle="sidebar-popover"]').popover({
        html: true,
        template: '<div class="popover sidebar-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    })

    var $sidebarButton = $('.sidebar-button')

    $sidebarButton.click(function () {
        var $this = $(this)
        var isActive = $this.hasClass('active')

        if($this.hasClass('disabled')) return false

        $sidebarButton.removeClass('active')

        if (isActive) {
            $this.removeClass('active')
        } else {
            $this.addClass('active')
        }

        $sidebarButton.trigger('classChange')
    })

    var $sidebarHideButton = $('.hide-sidebar');
    $sidebarHideButton.click(function () {
        $sidebarButton.removeClass('active').trigger('classChange');
    });

    $('#sidebar-scroll-top-button').click(function() {
        document.documentElement.scrollTop = 0
    })
})
