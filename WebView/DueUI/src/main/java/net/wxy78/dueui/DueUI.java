package net.wxy78.dueui;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

public class DueUI extends AppCompatActivity implements View.OnClickListener {
	private static final int UI_ANIMATION_DELAY = 300;
	private final Handler mHideHandler = new Handler();
	SharedPreferences sharedPref;
	private View mUrlView;
	private WebView mWebView;
	private EditText mDueUIURL;
	private Switch mShowAtStartup;
	private Button mGoButton;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		sharedPref = PreferenceManager.getDefaultSharedPreferences(this);
		String url = sharedPref.getString("preference_url", "http://dueui.org/");
		Boolean show_at_startup = sharedPref.getBoolean("preference_show_at_startup", true);
		Boolean already_run = sharedPref.getBoolean("preference_already_run", false);

		setContentView(R.layout.activity_fullscreen);
		ActionBar actionBar = getSupportActionBar();
		if (actionBar != null) {
			actionBar.hide();
		}

		mWebView = findViewById(R.id.webview);
		mUrlView = findViewById(R.id.urlView);
		mDueUIURL = findViewById(R.id.dueuiURL);
		mShowAtStartup = findViewById(R.id.show_at_startup);
		mGoButton = findViewById(R.id.goButton);
		if (show_at_startup || !already_run) {
			mDueUIURL.setText(url);
			mShowAtStartup.setChecked(show_at_startup);
			mUrlView.setVisibility(View.VISIBLE);
			mWebView.setVisibility(View.GONE);
		} else {
			showWebView(url);
			goFullscreen(mWebView);
		}

		mGoButton.setOnClickListener(this);

		mWebView.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
			@Override
			public void onGlobalLayout() {

				if (mUrlView.isShown()) {
					return;
				}

				Rect r = new Rect();
				mWebView.getWindowVisibleDisplayFrame(r);
				int screenHeight = mWebView.getRootView().getHeight();
				int keypadHeight = screenHeight - r.bottom;
				if (keypadHeight > screenHeight * 0.15) { // 0.15 ratio is perhaps enough to determine keypad height.
					// keyboard is opened
					unFullscreen(mWebView);
				} else {
					// keyboard is closed
					goFullscreen(mWebView);
				}
			}
		});
	}
/*
    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
    }
*/

	public void goFullscreen(View v) {

		v.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE
			| View.SYSTEM_UI_FLAG_FULLSCREEN
			| View.SYSTEM_UI_FLAG_LAYOUT_STABLE
			| View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
			| View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
			| View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);

	}

	public void unFullscreen(View v) {
		int vis = v.getSystemUiVisibility();

		if ((vis & View.SYSTEM_UI_FLAG_FULLSCREEN) != 0) {
			int nv = vis ^= View.SYSTEM_UI_FLAG_LOW_PROFILE
				| View.SYSTEM_UI_FLAG_FULLSCREEN
				| View.SYSTEM_UI_FLAG_LAYOUT_STABLE
				| View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
				| View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
				| View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
			v.setSystemUiVisibility(nv);
		}
	}

	public void onClick(View v) {
		String url = mDueUIURL.getText().toString();
		Boolean show_at_startup = mShowAtStartup.isChecked();

		View view = this.getCurrentFocus();
		if (view != null) {
			InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
			imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
		}
		SharedPreferences.Editor editor = sharedPref.edit();
		editor.putString("preference_url", url);
		editor.putBoolean("preference_show_at_startup", show_at_startup);
		editor.putBoolean("preference_already_run", true);
		editor.commit();

		goFullscreen(mWebView);
		showWebView(url);
	}

	public void showWebView(String url) {
		mUrlView.setVisibility(View.GONE);
		mWebView.setVisibility(View.VISIBLE);
		mWebView.setWebViewClient(new DueUIWebView());
		mWebView.getSettings().setJavaScriptEnabled(true);
		mWebView.getSettings().setLoadsImagesAutomatically(true);
		mWebView.loadUrl(url);
	}

	private class DueUIWebView extends WebViewClient {
		@Override
		public boolean shouldOverrideUrlLoading(WebView view, String url) {
			view.loadUrl(url);
			return true;
		}
	}
}
