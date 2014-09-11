(function() {

    return {

        comments: [],

        requests: {
            getComments: function(ticket_id, page) {
                return {
                    url: helpers.fmt('/api/v2/tickets/%@/comments.json?page=%@', ticket_id, page)
                };
            },

            putTextRedaction: function(data, ticket_id, comment_id) {
                return {
                    url: helpers.fmt('/api/v2/tickets/%@/comments/%@/redact.json', ticket_id, comment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(data)
                };
            },

            putAttachmentRedaction: function(ticket_id, comment_id, attachment_id) { //	REST API attachment redaction
                return {
                    url: helpers.fmt('/api/v2/tickets/%@/comments/%@/attachments/%@/redact.json', ticket_id, comment_id, attachment_id),
                    dataType: 'JSON',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: '{"":""}'
                };
            },

            getCustomRoles: function(){
              return {
                url: '/api/v2/custom_roles.json'
              };
            }
        },

        events: {
            'app.activated': 'init',
            'click .submit_text': 'popText',
            'click .confirm_text_redaction': 'makeTextRedaction',
            'click .attach_redact': 'attachMenu',
            'click .AttachConfirm': 'confirmAttachment',
            'click .save_attach_redact': 'makeAttachmentRedaction',
            'click .AttachLeave': function(){
              this.switchTo('text_redact');
            }
        },

        init: function() {
            this.comments = [];
            var ticket_id = this.ticket().id();
            var fetchedComments = this._paginate({
                request: 'getComments',
                entity: 'comments',
                id: ticket_id,
                page: 1
            });

            fetchedComments
                .done(_.bind(function(data) {
                    this.comments = data;
                }, this))
                .fail(_.bind(function() {
                    services.notify("Something went wrong and we couldn't reach the REST API to retrieve all comment data", 'error');
                }, this));
            var current_role_id = this.currentUser().role();
            this.ajax('getCustomRoles')
            .done(function(data){
              var role_check = _.filter(data.custom_roles, function(role) {
                return role.id === current_role_id;
              });
              var can_delete =  role_check[0].configuration.ticket_deletion;
              this.switchTo('text_redact', {
                can_delete: can_delete
                });
            })
            .fail(function(){
              this.notifyFail();
            });

        },

        popText: function() {
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/\s*[\n]/g, "\n").trim();
            var comment_data = this.comments;
            var matched_comments = _.chain(comment_data)
                .filter(function(comment) { //	Creates a new object only including comments that contain the user's desired string
                    var body_text = comment.body;
                    return body_text.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length;
            if (user_string !== "") { //	If the string to be redacted isn't blank, then display the confirmation modal
                this.$('.text_redact').modal({ //	Fires a modal to display the string that will be redacted and how many times it appears on the ticket.
                    backdrop: true,
                    keyboard: false,
                    body: this.$('.modal-body div.string_presenter').text(user_string),
                    total_actions: this.$('.modal-body span.num_actions').text(total_actions)
                });
            } else { //	If the form is submitted without any content, then let the customer know what they did.
                services.notify('Your redaction cannot be blank. Double check that you have pasted content into the text area.', 'error');
            }
        },

        makeTextRedaction: function() {
            this.$('.text_redact').modal('hide');
            var user_string = this.$('.redaction_string')[0].value;
            var escaped_string = user_string.replace(/\s*[\n]/g, "\n").trim();
            var comment_data = this.comments;
            var matched_comments = _.chain(comment_data)
                .filter(function(comment) { //	Creates a new object only including comments that contain the user's desired string
                    var body_text = comment.body;
                    return body_text.indexOf(escaped_string) > -1;
                })
                .value();
            var total_actions = matched_comments.length;
            var ticket_id = this.ticket().id();
            var text_data = {
                "text": escaped_string
            };
            var requests = [];

            for (var x = 0; x < total_actions; x++) {
                var comment_id = matched_comments[x].id;
                requests.push(this.ajax('putTextRedaction', text_data, ticket_id, comment_id)); //	Fires the actual request to redact.json for text redactions
            }

            this._handleRequests(requests);
        },

        attachMenu: function() { //	Maps comments.json to provide an array of attachments and necessary data to redact and/or display them
            var comment_data = this.comments;
            var attachments = _.chain(comment_data)
                .filter(function(comment) {
                    return comment.attachments.length > 0;
                })
                .map(function(comment) {
                    return {
                        attachment_array: _.map(comment.attachments, function(attachment) {
                            return {
                                comment_id: comment.id,
                                attachment_id: attachment.id,
                                type: attachment.content_type,
                                url: attachment.content_url,
                                file: attachment.file_name
                            };
                        })
                    };
                })
                .map(function(comment) {
                    return comment.attachment_array;
                })
                .flatten(true)
                .filter(function(attachment) {
                    return attachment.file !== "redacted.txt";
                })
                .value();
            var count = attachments.length;
            for (var x = 0; x < count; x++) {
                attachments[x].key = x;
            }
            this.switchTo('redact_attach', { //	Fires off a function to take the attachment array and display a list of attachments available for redaction (minus redacted.txt files)
                attachments: attachments
            });
        },

        getSelectedAttachments: function() { //	Handler for grabbing the janky input from the attachment list template. Each attachment object has five hidden inputs that need to be grouped.
            var inputData = this.$('ul#attachmentList li input').serializeArray();
            var selected_attachments = _.chain(inputData)
                .groupBy(function(data) {
                    return data.name;
                })
                .filter(function(data) {
                    return data.length > 5;
                })
                .map(function(attachment) {
                    return { //	This is mapped in the order that hidden elements appear in the checkbox list. If that order changes, then the related array key will need to change.
                        selected: attachment[0].value,
                        attachment_id: attachment[1].value,
                        url: attachment[2].value,
                        file: attachment[3].value,
                        comment_id: attachment[4].value,
                        file_type: attachment[5].value
                    };
                })
                .value();
            return selected_attachments;
        },

        confirmAttachment: function() { //	Fires off a modal to confirm the attachments selected for redaction. Image attachments will show thumbnails, generic icon for others
            var selected_attachments = this.getSelectedAttachments();

            var attachList = '';
            var count = selected_attachments.length;
            if (count === 0) {
                this.$('.attach_noselection').modal({
                    backdrop: true,
                    keyboard: false
                });
                return false;
            }
            var generic_icon = this.assetURL('document_generic.png');
            for (var x = 0; x < count; x++) {
                if (selected_attachments[x].file_type.split("/")[0] == "image") { //	If the attachment is an image, show it.
                    attachList += '<li><img src=\"' + selected_attachments[x].url + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                } else { //	If the attachment is anything other than an image, show a generic file icon
                    attachList += '<li><img src=\"' + generic_icon + '\" /> <span class=\"modal_filename\">' + selected_attachments[x].file + '</span></li>';
                }
            }
            var presentedAttachments = '<p>You will be permanently removing the below files:</p><ul class=\"redaction_img_list\">' + attachList + '</ul>'; //	HTML to inject
            this.$('.attach_redact').modal({ //	The above funciton and iteration is a bit dirty. Can be cleaned up using something like 'var html = this.renderTemplate()'
                backdrop: true,
                keyboard: false,
                body: this.$('.modal-body div.attachPresenter').html(presentedAttachments)
            });
        },

        makeAttachmentRedaction: function() {
            this.$('.attach_redact').modal('hide');
            var selected_attachments = this.getSelectedAttachments();
            var count = selected_attachments.length;
            var ticket_id = this.ticket().id();
            var requests = [];

            for (var x = 0; x < count; x++) {
                var comment_id = selected_attachments[x].comment_id;
                var attachment_id = selected_attachments[x].attachment_id;
                requests.push(this.ajax('putAttachmentRedaction', ticket_id, comment_id, attachment_id));
            }

            this._handleRequests(requests);
        },

        _paginate: function(a) {
            var results = [];
            var initialRequest = this.ajax(a.request, a.id, a.page);
            // create and return a promise chain of requests to subsequent pages
            var allPages = initialRequest.then(function(data) {
                results.push(data[a.entity]);
                var nextPages = [];
                var pageCount = Math.ceil(data.count / 100);
                for (; pageCount > 1; --pageCount) {
                    nextPages.push(this.ajax(a.request, a.id, pageCount));
                }
                return this.when.apply(this, nextPages).then(function() {
                    var entities = _.chain(arguments)
                        .flatten()
                        .filter(function(item) {
                            return (_.isObject(item) && _.has(item, a.entity));
                        })
                        .map(function(item) {
                            return item[a.entity];
                        })
                        .value();
                    results.push(entities);
                }).then(function() {
                    return _.chain(results)
                        .flatten()
                        .compact()
                        .value();
                });
            });
            return allPages;
        },

        _handleRequests: function(requests) {
            this.when.apply(this, requests).done(_.bind(function() {
                this.notifySuccess();
                this.init();
            }, this))
                .fail(_.bind(function() {
                    this.notifyFail();
                }, this));
        },

        notifySuccess: function() { //	Cannot refresh ticket data from app, user must refresh page.
            services.notify('Your redactions were successful. Refresh the page to update this ticket view.');
        },

        notifyFail: function() { //	Whoops?
            services.notify('One or more of the redactions failed...please try again', 'error');
        }
    };

}());
