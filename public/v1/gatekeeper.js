/**
 * GateKeeper Drop-In Client Embed SDK (v1.0.0)
 * Lightweight zero-dependency script for embedding paywalled booking buttons and modals.
 *
 * Usage:
 * <script src="https://your-domain.com/v1/gatekeeper.js"></script>
 * <button data-gatekeeper-checkout="srv_1" data-gatekeeper-key="gk_live_...">Book Consultation</button>
 */
(function (window, document) {
  'use strict';

  if (window.GateKeeper) {
    return;
  }

  const GateKeeper = {
    version: '1.0.0',
    config: {
      endpoint: '',
      apiKey: '',
    },

    init: function (options) {
      if (options) {
        this.config = Object.assign({}, this.config, options);
      }
      this.bindElements();
    },

    getApiBase: function () {
      if (this.config.endpoint) return this.config.endpoint.replace(/\/$/, '');
      const script = document.currentScript || document.querySelector('script[src*="gatekeeper.js"]');
      if (script && script.src) {
        const url = new URL(script.src);
        return url.origin;
      }
      return window.location.origin;
    },

    /**
     * Programmatically launch a Paywalled Checkout Session
     */
    openCheckout: function (options) {
      const opts = options || {};
      const base = this.getApiBase();
      const apiKey = opts.apiKey || this.config.apiKey;

      const serviceId = opts.serviceId || 'srv_1';
      const clientEmail = opts.clientEmail || '';
      const clientName = opts.clientName || '';
      const customDuration = opts.customDurationMinutes || '';

      const checkoutUrl =
        base +
        '/?serviceId=' +
        encodeURIComponent(serviceId) +
        (clientEmail ? '&email=' + encodeURIComponent(clientEmail) : '') +
        (clientName ? '&name=' + encodeURIComponent(clientName) : '') +
        (customDuration ? '&duration=' + encodeURIComponent(customDuration) : '') +
        '&v1_embed=true';

      if (opts.mode === 'redirect') {
        window.location.href = checkoutUrl;
        return;
      }

      // Default: Modal Overlay
      this._openModal(checkoutUrl, opts);
    },

    /**
     * Atomically verify a pass token
     */
    verifyPass: async function (passToken, apiKey, options) {
      const base = this.getApiBase();
      const key = apiKey || this.config.apiKey;
      const opts = options || {};

      try {
        const response = await fetch(base + '/api/v1/passes/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': key,
          },
          body: JSON.stringify({
            passToken: passToken,
            serviceId: opts.serviceId,
            operator: opts.operator || 'web_embed_client',
          }),
        });
        return await response.json();
      } catch (err) {
        return { success: false, valid: false, error: err.message };
      }
    },

    /**
     * Inspect a pass without consuming it
     */
    inspectPass: async function (passToken, apiKey) {
      const base = this.getApiBase();
      const key = apiKey || this.config.apiKey;

      try {
        const response = await fetch(base + '/api/v1/passes/' + encodeURIComponent(passToken), {
          method: 'GET',
          headers: {
            'X-API-Key': key,
          },
        });
        return await response.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    _openModal: function (url, opts) {
      // Remove any existing modal
      const existing = document.getElementById('gk-modal-container');
      if (existing) existing.remove();

      const container = document.createElement('div');
      container.id = 'gk-modal-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
      container.style.backdropFilter = 'blur(6px)';
      container.style.zIndex = '999999';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.padding = '16px';
      container.style.boxSizing = 'border-box';
      container.style.animation = 'gkFadeIn 0.2s ease-out';

      const frameWrapper = document.createElement('div');
      frameWrapper.style.position = 'relative';
      frameWrapper.style.width = '100%';
      frameWrapper.style.maxWidth = '460px';
      frameWrapper.style.height = '680px';
      frameWrapper.style.maxHeight = '90vh';
      frameWrapper.style.backgroundColor = '#ffffff';
      frameWrapper.style.borderRadius = '16px';
      frameWrapper.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.35)';
      frameWrapper.style.overflow = 'hidden';
      frameWrapper.style.display = 'flex';
      frameWrapper.style.flexDirection = 'column';

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close checkout');
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '12px';
      closeBtn.style.right = '12px';
      closeBtn.style.width = '32px';
      closeBtn.style.height = '32px';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.border = 'none';
      closeBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      closeBtn.style.color = '#1e293b';
      closeBtn.style.fontSize = '20px';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.display = 'flex';
      closeBtn.style.alignItems = 'center';
      closeBtn.style.justifyContent = 'center';
      closeBtn.style.zIndex = '10';

      closeBtn.onclick = function () {
        container.remove();
        if (typeof opts.onCancel === 'function') opts.onCancel();
      };

      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.setAttribute('allow', 'payment');

      frameWrapper.appendChild(closeBtn);
      frameWrapper.appendChild(iframe);
      container.appendChild(frameWrapper);
      document.body.appendChild(container);

      // Listen for message events from iframe
      const messageHandler = function (event) {
        if (event.data && event.data.type === 'GATEKEEPER_PAYMENT_SUCCESS') {
          if (typeof opts.onSuccess === 'function') {
            opts.onSuccess(event.data.payload);
          }
        }
      };
      window.addEventListener('message', messageHandler);
    },

    bindElements: function () {
      const triggers = document.querySelectorAll('[data-gatekeeper-checkout]');
      triggers.forEach(function (btn) {
        if (btn.dataset.gkBound) return;
        btn.dataset.gkBound = 'true';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          const serviceId = btn.getAttribute('data-gatekeeper-checkout');
          const apiKey = btn.getAttribute('data-gatekeeper-key');
          GateKeeper.openCheckout({
            serviceId: serviceId,
            apiKey: apiKey,
          });
        });
      });
    },
  };

  window.GateKeeper = GateKeeper;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      GateKeeper.init();
    });
  } else {
    GateKeeper.init();
  }
})(window, document);
