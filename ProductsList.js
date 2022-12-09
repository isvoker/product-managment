class ProductsList extends Products {

    container = null;
    state = {};
    page = 1;
    limit = null;
    qtyProducts = null;
    typeId = null;
    companyId = null;

    constructor() {
        super();

        this.container = document.querySelector('.js__search-block');
        this.url = new URL(window.location);
        this.qtyProducts = this.limit;
        if (!this.container) {
            return false;
        }
        this.state = {
            liveRestrictions: {},
            storageKey: '',
            isLoading: false,
            isReloading: false,
            isComplete: false,
            isShowPromo: true
        };

        this.typeId = document.querySelector('.js__products').dataset.type;
        this.companyId = document.querySelector('.js__products').dataset.companyId;
        this.fields = this.getSearchParams();
        this.isMainPage = this.container.dataset.hasOwnProperty('mainPageSearch');

        ProductAttribute.renderInputs(this.typeId, () => {
            this.setValuesFilter();
        });
        ProductMainMethod.initListenersForTags();

        this.setQuantityHandlers(document);
        this.initFilterSliders();
        this.fetchProductList(this.fields);
        this.setAppliedFilters();
        this.searchByCompanies();
        this.addListeners();
    };

    addListeners() {
        document.querySelectorAll('.js__toggle-header').forEach((item) => {
            item.addEventListener('click', () => {
                item.closest('.js__toggle-container').classList.toggle('active');
            });
        });

        document.querySelectorAll('.js__product-search').forEach((btn) => {
            btn.addEventListener('click', (evt) => {
                Sensei.ignoreEvent(evt);
                this.clearProductList();
                this.qtyProducts = this.limit;
                this.page = 1;

                this.collectData(this.fields);
                this.setSearchParams();
                this.fetchProductList(this.fields);
                this.setAppliedFilters();
            })
        });

        window.addEventListener('popstate', () => {
            this.fields = this.getSearchParams();
            this.clearProductList();
            this.qtyProducts = this.limit;
            this.page = 1;

            this.setAppliedFilters();
            document.querySelectorAll('.js__collect-data').forEach((block) => {
                const code = block.dataset.code;
                block.classList.remove('active');
                this.resetValueFilter(code);
            });
            this.setValuesFilter();
            this.companyId = this.searchByCompanies();
            this.fetchProductList(this.fields);
        });


        document.querySelectorAll('.js__reset-filter').forEach((btnResetFilter) => {
            btnResetFilter.addEventListener('click', (evt) => {
                Sensei.ignoreEvent(evt);
                const containerHintsFilters = document.querySelector('.js__insert-reset-attr');
                for (const key in this.fields) {
                    if (!this.fields.hasOwnProperty(key)) {
                        continue;
                    }
                    delete this.fields[key];
                    this.resetValueFilter(key);
                    containerHintsFilters.querySelector(`[data-code='${key}']`).closest('.js__applied-filters').remove();
                }
                this.setSearchParams();
                this.clearProductList();
                this.qtyProducts = this.limit;
                this.page = 1;

                this.fetchProductList(this.fields);
            });
        });

        document.querySelector('.js__product-sort-by').addEventListener('change', (evt) => {
            const selectedOption = evt.target.options[evt.target.selectedIndex];
            let orderBy = {};
            orderBy[selectedOption.dataset.orderBy] = selectedOption.value;
            this.clearProductList();
            this.qtyProducts = this.limit;
            this.page = 1;

            this.fetchProductList(this.fields, orderBy)
        });

        document.querySelector('.js__show-product-filter').addEventListener('click', () => {
            document.querySelector('.js__product-filter').classList.add('show-mob-filter');
        });

        document.querySelector('.js__hidden-product-filter').addEventListener('click', (evt) => {
            Sensei.ignoreEvent(evt);
            document.querySelector('.js__product-filter').classList.remove('show-mob-filter');
        });

        document.querySelector('.js__load-more').addEventListener('click', (evt) => {
            Sensei.ignoreEvent(evt);
            this.page++;
            this.qtyProducts += this.limit;
            this.fetchProductList(this.fields);
        });

        document.querySelector('.js__remove-company').addEventListener('click', (evt) => {
            Sensei.ignoreEvent(evt);
            evt.target.closest('.js__company-block-search').classList.add('hidden-el');
            this.url.searchParams.delete('c');
            this.companyId = null;
            window.history.pushState("", "", `${this.url}`);
            this.fetchProductList(this.fields);
        });
    };

    searchByCompanies() {
        let queryDict = {};
        let searchParams = location.search;

        if (!searchParams) {
            return;
        }

        searchParams.slice(1).split("&").forEach((item) => {
            queryDict[item.split("=")[0]] = item.split("=")[1];
        });

        const companyId = queryDict['c'];

        if (!companyId) {
            document.querySelector('.js__company-block-search.active')?.classList.add('hidden-el');
            return false;
        }
        document.querySelector('.js__company-block-search.active')?.classList.remove('hidden-el');
        return companyId;
    };

    clearProductList() {
        document.querySelector('.js__products-list').innerHTML = '';
    };

    fetchProductList(fields, orderBy) {
        if (!orderBy) {
            orderBy = {updated_at: 'desc'};
        }

        Sensei.xhr({
            data: {
                controller: 'products.d',
                action: 'fetch',
                type: 1,
                q: fields,
                orderBy: orderBy,
                page: this.page,
                companyId: this.companyId
            },
            onSuccess: (response) => {

                if (!this.limit) {
                    this.limit = response.limit;
                    this.qtyProducts = this.limit;
                }

                document.querySelector('.js__total-products-found').innerHTML = response.total;
                this.buildCartProduct(response.items);

                Bookmarks.init();

                if (response.total > this.qtyProducts) {
                    document.querySelector('.js__load-more').classList.remove('hidden-el');
                } else {
                    document.querySelector('.js__load-more').classList.add('hidden-el');
                }
            }
        });
    };

    buildCartProduct(data) {
        const insetProductBlock = document.querySelector('.js__products-list');
        data.forEach((item) => {
            const productTemplate = document.querySelector('.js__product-template').cloneNode(true);
            const JsonData = JSON.parse(item.data);
            const unitedObj = Object.assign(item, JsonData);

            productTemplate.classList.remove('js__product-template', 'hidden-el');
            productTemplate.querySelector('.js__product-card-bookmarks').classList.add('js__bookmarkable');

            for (const key in unitedObj) {
                if (!unitedObj.hasOwnProperty(key)) {
                    continue;
                }

                const element = productTemplate.querySelector(`.js__product-card-${key}`);
                const value = JsonData[key];

                if (!element) {
                    continue;
                }

                switch (key) {
                    case 'name':
                        element.textContent = item[key];
                        element.setAttribute('href', item['url']);
                        break;
                    case 'img':
                        element.setAttribute('src', item[key]);
                        break;
                    case 'url':
                        element.setAttribute('href', item[key]);
                        break;
                    case 'eatg':
                    case 'acmd':
                    case 'ppay':
                        fillAttributeProduct(value, element)
                        break;
                    case 'dfty':
                        element.querySelectorAll('.js__complexity-item').forEach((item) => {
                            if (Number(item.dataset.complexity) === value) {
                                item.classList.add('active');
                            }
                        })
                        break;
                    case 'tags':
                        value.forEach((tag) => {
                            element.innerHTML += `<span class="tag">#${tag}</span>`;
                        })
                        break;
                    case 'bookmarks':
                        element.dataset.id = item['id'];
                        element.querySelector('.js__bookmarks-counter').textContent = item[key];
                        break;
                    case 'accredited':
                        if (!item[key]) {
                            element.classList.add('hidden-el');
                        }
                        break;
                    case 'dates':
                        const previewDate = element.querySelector('.js__card-insert-date');
                        const btnMore = element.querySelector('.js__card-insert-more');

                        for (let i in value) {
                            if (!value.hasOwnProperty(i)) {
                                continue;
                            }
                            if (!Number(i)) {
                                previewDate.innerHTML += `<span>${value[i].begin} - ${value[i].end}</span>`
                            }
                            if (Number(i)) {
                                btnMore.textContent = 'Еще...';
                                btnMore.setAttribute('href', item['url']);
                                break;
                            }
                        }
                        break;
                    default:
                        element.textContent = item[key];
                        break;
                }
            }

            function fillAttributeProduct(value, element) {
                const label = ProductAttribute.getLabelForBooleanValue(value);

                if (!label) {
                    return;
                }

                element.classList.add('active');

                element.innerHTML =
                    `<div class="flex ai-c column-gap-2">
                        <svg class="svg-ico f-00"><use href="#ico-${value}"></use></svg>
                        <span class="f-11">${label}</span>
                    </div>`;
            }

            insetProductBlock.appendChild(productTemplate);
        })
    };

    setSearchParams() {
        const setParam = (name, value) => {
            this.url.searchParams.set(name, value);
        };
        const deleteParam = (name) => {
            this.url.searchParams.delete(name);
        }

        if (!Object.entries(this.fields).length) {
            deleteParam('s');
        } else {
            setParam('s', btoa((JSON.stringify(this.fields))).replace(/=/g, ''));
        }

        window.history.pushState("", "", `${this.url}`);
    };

    setValuesFilter() {
        const picker = $('#daterangepicker');

        for (const key in this.fields) {
            if (!this.fields.hasOwnProperty(key)) {
                continue;
            }
            let data = this.fields[key];
            let parent = document.querySelector(`.js__collect-data[data-code=${key}]`);

            switch (key) {
                case 'party':
                    let qtyChild = 0;
                    for (const partyKey in data) {
                        if (!data.hasOwnProperty(partyKey)) {
                            continue;
                        }
                        if (data[partyKey].age === '18') {
                            document.querySelector('.js__adults-quantity-input').value = data[partyKey].qty;
                            document.querySelector('.js__adults-quantity .js__qty-field').value = data[partyKey].qty;
                        } else {
                            const createdElem = this.createFieldChild();
                            createdElem.querySelector('.js__input').value = data[partyKey].age;
                            qtyChild++;
                        }
                    }
                    document.querySelector('.js__children-quantity-input').value = qtyChild;
                    document.querySelector('.js__children-quantity .js__qty-field').value = qtyChild;
                    break;
                case 'date_begin':
                    document.querySelector(`.js__input[name=${key}]`).value = data;
                    picker.data('daterangepicker').startDate = moment(data);
                    picker.find('.js__date-begin-label').html(picker.data('daterangepicker').startDate.format('DD.MM.YYYY'));
                    break;
                case 'date_end':
                    document.querySelector(`.js__input[name=${key}]`).value = data;
                    picker.data('daterangepicker').endDate = moment(data);
                    picker.find('.js__date-end-label').html(picker.data('daterangepicker').endDate.format('DD.MM.YYYY'));
                    break;
                case 'price_min':
                    const priceMax = document.querySelector('.js__input[name=price_max]').value;
                    document.querySelector(`.js__input[name=${key}]`).value = data;
                    document.querySelector('.js__filter-slider').noUiSlider.set([data, priceMax]);
                    break;
                case 'price_max':
                    const priceMin = document.querySelector('.js__input[name=price_min]').value;
                    document.querySelector(`.js__input[name=${key}]`).value = data;
                    document.querySelector('.js__filter-slider').noUiSlider.set([priceMin, data]);
                    break;
                case 'hot':
                    document.querySelector(`.js__input[name=${key}]`).checked = true;
                    break;
                case 'tags':
                    data.forEach((el) => {
                        document.querySelector('.js__tag-input').value = el;
                        ProductMainMethod.createTag();
                    })
                    break;
                default:
                    data.forEach((el) => {
                        parent.querySelector(`.js__input[value="${el}"]`).checked = true;
                    });
                    parent.classList.add('active');
                    break;
            }
        }
    };

    setAppliedFilters() {
        const insert = document.querySelector('.js__insert-reset-attr');
        //const schema = CommonScript.getAttributesSchema();

        insert.innerHTML = '';
        for (const key in this.fields) {
            if (!this.fields.hasOwnProperty(key)) {
                continue;
            }

            const cloneElement = document.querySelector('.js__applied-filters-element-copy').cloneNode(true);
            cloneElement.classList.remove('hidden-el', 'js__applied-filters-element-copy');

            const createdElement = insert.appendChild(cloneElement);
            const btnRemove = createdElement.querySelector('.js__applied-filters-remove');
        
            ProductAttribute.loadDescription(this.typeId, key).then((name) => {
                cloneElement.querySelector('.js__applied-filters-name').textContent = name;
            });

            btnRemove.dataset.code = key;
            btnRemove.addEventListener('click', (evt) => {
                const code = evt.target.dataset.code;
                delete this.fields[code];
                this.resetValueFilter(code);
                evt.target.closest('.js__applied-filters').remove();
                this.setSearchParams();
                this.clearProductList();
                this.fetchProductList(this.fields);
            })
        }
    };

    resetValueFilter(code) {
        const elem = this.container.querySelector(`.js__collect-data[data-code=${code}]`);
        const picker = $('#daterangepicker');

        switch (code) {
            case 'tags':
                elem.querySelector('.js__tag-insert').innerHTML = '';
                break;
            case 'date_begin':
                document.querySelector(".js__input[name='date_begin']").value = '';
                picker.find('.js__date-begin-label').html('Заезд');
                break;
            case 'date_end':
                document.querySelector(".js__input[name='date_end']").value = '';
                picker.find('.js__date-end-label').html('Отъезд');
                break;
            case 'price_min':
                const priceMax = document.querySelector('.js__input[name=price_max]').value;
                const min = document.querySelector('.js__filter-slider').dataset.min;
                document.querySelector('.js__filter-slider').noUiSlider.set([min, priceMax]);
                break;
            case 'price_max':
                const priceMin = document.querySelector('.js__input[name=price_min]').value;
                const max = document.querySelector('.js__filter-slider').dataset.max;
                document.querySelector('.js__filter-slider').noUiSlider.set([priceMin, max]);
                break;

            case 'party':
                elem.querySelector('.js__age-of-children-container').innerHTML = '';
                elem.querySelectorAll('.js__qty-field, .js__children-quantity-input, .js__adults-quantity-input')
                    .forEach((input) => {
                        input.value = 0;
                    });
                break;
            default:
                elem.querySelectorAll('.js__input').forEach((input) => {
                    if (input.checked) {
                        input.checked = false;
                    }
                });
                break;
        }
    };

    initFilterSliders() {
        const _ = this;

        [].forEach.call(document.getElementsByClassName('js__filter-slider'), function(slider) {
            const filter = slider.closest('.shop__filter');
            const field = filter.dataset.field;
            const label = filter.dataset.label;
            const inputs = [
                filter.getElementsByClassName('shop__filter-range_min')[0],
                filter.getElementsByClassName('shop__filter-range_max')[0]
            ];

            const min = Number(slider.dataset.min) || 0;
            const max = Number(slider.dataset.max);
            const initialMin = _.getRestriction(field + '_min') || min;
            const initialMax = _.getRestriction(field + '_max') || max;
            const step = Number(slider.dataset.step);
            const isIntValues = Number.isInteger(step);

            noUiSlider.create(slider, {
                range: {
                    'min': [min],
                    'max': [max]
                },
                start: [initialMin, initialMax],
                connect: true,
                step: step,
                tooltips: true,
                format: {
                    to: function(value) {
                        return isIntValues
                            ? Math.round(value)
                            : Math.round(value * 100) / 100;
                    },
                    from: function(value) {
                        return isIntValues
                            ? parseInt(value)
                            : parseFloat(value);
                    }
                }
            });

            slider.noUiSlider.on('update', function(values, index) {
                const value = Number(values[index]);
                let filterField = field;

                inputs[index].value = value;

                if (index === 0) {
                    filterField += '_min';
                    if (value > min) {
                        _.addRestriction({
                            field: filterField,
                            value: value,
                            label: label + ' от'
                        });
                    } else {
                        _.removeRestriction({field: filterField});
                    }
                } else {
                    filterField += '_max';
                    if (value < max) {
                        _.addRestriction({
                            field: filterField,
                            value: value,
                            label: label + ' до'
                        });
                    } else {
                        _.removeRestriction({field: filterField});
                    }
                }
            });

            inputs.forEach(function(input, index) {
                input.addEventListener('change', function() {
                    const values = [null, null];

                    values[index] = this.value;
                    slider.noUiSlider.set(values);
                });
            });
        });
    };

    resetFilterSliders() {
        [].forEach.call(document.getElementsByClassName('js__filter-slider'), function(slider) {
            const min = Number(slider.dataset.min) || 0;
            const max = Number(slider.dataset.max);

            slider.noUiSlider.set([min, max]);
        });
    };

    addRestriction(arg) {
        if (
            !arg.hasOwnProperty('isMultiple')
            || Sensei.is(arg.isMultiple, 'undefined')
        ) {
            this.state.liveRestrictions[arg.field] = arg.value;
        } else {
            if (!this.state.liveRestrictions.hasOwnProperty(arg.field)) {
                this.state.liveRestrictions[arg.field] = {};
            }
            this.state.liveRestrictions[arg.field][arg.value] = true;
        }
    };

    removeRestriction(arg) {
        if (
            !arg.hasOwnProperty('isMultiple')
            || Sensei.is(arg.isMultiple, 'undefined')
        ) {
            delete this.state.liveRestrictions[arg.field];
        } else {
            if (
                this.state.liveRestrictions.hasOwnProperty(arg.field)
                && this.state.liveRestrictions[arg.field].hasOwnProperty(arg.value)
            ) {
                delete this.state.liveRestrictions[arg.field][arg.value];
                if (!Object.keys( this.state.liveRestrictions[arg.field] ).length) {
                    delete this.state.liveRestrictions[arg.field];
                }
            }
        }
    };

    getRestriction(field) {
        return this.state.liveRestrictions.hasOwnProperty(field)
            ? this.state.liveRestrictions[field]
            : null;
    };

}

document.addEventListener('DOMContentLoaded', () => {
    new ProductsList;
});
